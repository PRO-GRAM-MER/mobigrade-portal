"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  assertReturnTransition,
  ReturnMachineError,
  type ReturnActor,
} from "@/lib/return-machine";

const log = logger("return-actions");
import { z } from "zod";
import type { ReturnStatus } from "@prisma/client";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Shared helper ────────────────────────────────────────────────────────────

async function applyReturnTransition(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  returnRequestId: string,
  fromStatus: ReturnStatus,
  toStatus: ReturnStatus,
  actor: ReturnActor,
  actorId: string,
  note?: string,
  extraData?: Partial<{
    reviewedAt: Date;
    reviewedById: string;
    rejectionNote: string;
    pickupScheduledAt: Date;
    pickedUpAt: Date;
    receivedAt: Date;
  }>
) {
  assertReturnTransition(fromStatus, toStatus, actor, note);

  await tx.returnStatusHistory.create({
    data: {
      returnRequestId,
      fromStatus,
      toStatus,
      actor: `${actor}:${actorId}`,
      note: note ?? null,
    },
  });

  await tx.returnRequest.update({
    where: { id: returnRequestId },
    data: { status: toStatus, ...extraData },
  });
}

// ─── requestReturnAction ──────────────────────────────────────────────────────

const returnRequestSchema = z.object({
  orderId: z.string().cuid(),
  reason: z.enum(["WRONG_ITEM", "DAMAGED_IN_TRANSIT", "NOT_AS_DESCRIBED", "DEFECTIVE", "CHANGED_MIND", "OTHER"]),
  description: z.string().max(500).optional(),
  items: z
    .array(z.object({ orderItemId: z.string().cuid(), quantity: z.coerce.number().int().min(1) }))
    .min(1, "Select at least one item to return"),
});

export async function requestReturnAction(
  input: z.infer<typeof returnRequestSchema>
): Promise<ActionResult<{ returnRequestId: string }>> {
  const session = await auth();
  if (!session || session.user.role !== "RETAILER") {
    return { success: false, error: "Only buyers can request returns" };
  }

  const parsed = returnRequestSchema.safeParse(input);
  if (!parsed.success) {
    // Zod 4: ZodError.issues (was .errors in Zod 3)
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { orderId, reason, description, items } = parsed.data;

  const retailer = await prisma.retailerProfile.findUnique({
    where: { userId: session.user.id as string },
    select: { id: true },
  });
  if (!retailer) return { success: false, error: "Retailer profile not found" };

  const order = await prisma.order.findFirst({
    where: { id: orderId, retailerProfileId: retailer.id },
    select: {
      status: true,
      deliveredAt: true,
      items: { select: { id: true, quantity: true } },
    },
  });

  if (!order) return { success: false, error: "Order not found" };
  if (order.status !== "DELIVERED" && order.status !== "RETURN_IN_PROGRESS") {
    return { success: false, error: "Returns can only be requested for delivered orders" };
  }

  if (order.deliveredAt) {
    const windowEnd = new Date(order.deliveredAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (new Date() > windowEnd) {
      return { success: false, error: "Return window has closed (7 days after delivery)" };
    }
  }

  const orderItemMap = new Map(order.items.map((i) => [i.id, i.quantity]));
  for (const returnItem of items) {
    const ordered = orderItemMap.get(returnItem.orderItemId);
    if (ordered === undefined) {
      return { success: false, error: "One or more items do not belong to this order" };
    }
    if (returnItem.quantity > ordered) {
      return { success: false, error: "Cannot return more than ordered quantity" };
    }
  }

  const returnRequest = await prisma.$transaction(async (tx) => {
    const returnRequest = await tx.returnRequest.create({
      data: {
        orderId,
        retailerProfileId: retailer.id,
        reason,
        description: description ?? null,
        status: "REQUESTED",
        items: {
          create: items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity })),
        },
      },
    });

    if (order.status === "DELIVERED") {
      await tx.order.update({ where: { id: orderId }, data: { status: "RETURN_IN_PROGRESS" } });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: "DELIVERED",
          toStatus: "RETURN_IN_PROGRESS",
          actor: `BUYER:${session.user.id}`,
          note: `Return requested: ${reason}`,
        },
      });
    }

    await tx.returnStatusHistory.create({
      data: {
        returnRequestId: returnRequest.id,
        fromStatus: null,
        toStatus: "REQUESTED",
        actor: `BUYER:${session.user.id}`,
        note: `${reason}${description ? ` — ${description}` : ""}`,
      },
    });

    return returnRequest;
  });

  log.info("requestReturn: succeeded", { returnRequestId: returnRequest.id, orderId, userId: session.user.id });
  return { success: true, data: { returnRequestId: returnRequest.id } };
}

// ─── reviewReturnAction ───────────────────────────────────────────────────────

export async function reviewReturnAction(
  returnRequestId: string,
  decision: "APPROVED" | "REJECTED",
  note?: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnRequestId },
    select: { status: true, orderId: true },
  });

  if (!returnRequest) return { success: false, error: "Return request not found" };

  const toStatus = decision === "APPROVED" ? "APPROVED" : "REJECTED";

  try {
    await prisma.$transaction(async (tx) => {
      await applyReturnTransition(
        tx, returnRequestId,
        returnRequest.status as ReturnStatus, toStatus,
        "ADMIN", session.user.id as string, note,
        {
          reviewedAt: new Date(),
          reviewedById: session.user.id as string,
          ...(decision === "REJECTED" ? { rejectionNote: note } : {}),
        }
      );

      if (decision === "REJECTED") {
        const activeReturns = await tx.returnRequest.count({
          where: {
            orderId: returnRequest.orderId,
            status: { in: ["REQUESTED", "APPROVED", "PICKUP_SCHEDULED", "PICKED_UP", "RECEIVED"] },
            id: { not: returnRequestId },
          },
        });
        if (activeReturns === 0) {
          await tx.order.update({
            where: { id: returnRequest.orderId },
            data: { status: "DELIVERED" },
          });
        }
      }
    });
  } catch (e) {
    if (e instanceof ReturnMachineError) {
      log.warn("reviewReturn: invalid transition", { returnRequestId, error: e.message });
      return { success: false, error: e.message };
    }
    throw e;
  }

  log.info("reviewReturn: succeeded", { returnRequestId, decision, adminId: session.user.id });
  return { success: true, data: undefined };
}

// ─── closeReturnWithRefundAction ──────────────────────────────────────────────

export async function closeReturnWithRefundAction(
  returnRequestId: string,
  refundAmount: number
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  if (refundAmount <= 0) {
    return { success: false, error: "Refund amount must be positive" };
  }

  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnRequestId },
    include: { order: { select: { payment: { select: { id: true, amount: true } } } } },
  });

  if (!returnRequest) return { success: false, error: "Return request not found" };
  if (returnRequest.status !== "RECEIVED") {
    return { success: false, error: "Return must be in RECEIVED status to issue refund" };
  }

  const payment = returnRequest.order.payment;
  if (!payment) return { success: false, error: "No payment found for this order" };
  if (refundAmount > Number(payment.amount)) {
    return { success: false, error: "Refund amount exceeds order total" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await applyReturnTransition(tx, returnRequestId, "RECEIVED", "CLOSED", "ADMIN", session.user.id as string);

      await tx.refund.create({
        data: { paymentId: payment.id, returnRequestId, amount: refundAmount, status: "INITIATED" },
      });

      const isFullRefund = refundAmount >= Number(payment.amount);
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: isFullRefund ? "FULLY_REFUNDED" : "PARTIALLY_REFUNDED" },
      });

      const returnItems = await tx.returnItem.findMany({
        where: { returnRequestId },
        select: { orderItemId: true },
      });

      await tx.sellerEarning.updateMany({
        where: {
          orderItemId: { in: returnItems.map((i) => i.orderItemId) },
          status: { in: ["ON_HOLD", "CLEARED"] },
        },
        data: { status: "REVERSED" },
      });

      const activeReturns = await tx.returnRequest.count({
        where: {
          orderId: returnRequest.orderId,
          status: { notIn: ["CLOSED", "REJECTED"] },
          id: { not: returnRequestId },
        },
      });

      if (activeReturns === 0) {
        await tx.order.update({
          where: { id: returnRequest.orderId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      }
    });
  } catch (e) {
    if (e instanceof ReturnMachineError) {
      log.warn("closeReturnWithRefund: invalid transition", { returnRequestId, error: e.message });
      return { success: false, error: e.message };
    }
    throw e;
  }

  log.info("closeReturnWithRefund: succeeded", { returnRequestId, refundAmount, adminId: session.user.id });
  return { success: true, data: undefined };
}
