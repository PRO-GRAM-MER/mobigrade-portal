"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  assertTransition,
  OrderMachineError,
  type OrderActor,
} from "@/lib/order-machine";
import { z } from "zod";
import type { OrderStatus, CancelledBy } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Order number generator ───────────────────────────────────────────────────

function generateOrderNumber(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `MG-${ymd}-${rand}`;
}

// ─── Shared transition helper ─────────────────────────────────────────────────
// All status changes go through this — enforces machine + writes history.

async function applyOrderTransition(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orderId: string,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  actor: OrderActor,
  actorId: string,
  note?: string,
  extraData?: Partial<{
    cancelledAt: Date;
    cancelledBy: CancelledBy;
    cancellationNote: string;
    confirmedAt: Date;
    shippedAt: Date;
    deliveredAt: Date;
    completedAt: Date;
  }>
) {
  // Will throw OrderMachineError on invalid transition
  assertTransition(fromStatus, toStatus, actor, note);

  await tx.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus,
      toStatus,
      actor: `${actor}:${actorId}`,
      note: note ?? null,
    },
  });

  await tx.order.update({
    where: { id: orderId },
    data: { status: toStatus, ...extraData },
  });
}

// ─── placeOrderAction ─────────────────────────────────────────────────────────
// Creates Order + OrderItems + Payment + initial SellerEarning stubs.

const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        liveProductId: z.string().cuid(),
        quantity: z.coerce.number().int().min(1).max(999),
      })
    )
    .min(1, "Cart cannot be empty")
    .max(50, "Too many items in one order"),
  shippingAddressId: z.string().cuid(),
  paymentMethod: z.enum(["UPI", "BANK_TRANSFER", "CARD", "WALLET", "COD"]),
  gatewayOrderId: z.string().optional(),
});

export async function placeOrderAction(
  input: z.infer<typeof placeOrderSchema>
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  const session = await auth();
  if (!session || session.user.role !== "RETAILER") {
    return { success: false, error: "Only registered buyers can place orders" };
  }

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { items, shippingAddressId, paymentMethod, gatewayOrderId } = parsed.data;

  // ── Fetch retailer profile + address ──────────────────────────────────────
  const retailer = await prisma.retailerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      addresses: { where: { id: shippingAddressId } },
    },
  });

  if (!retailer) return { success: false, error: "Retailer profile not found" };
  const address = retailer.addresses[0];
  if (!address) return { success: false, error: "Shipping address not found" };

  // ── Resolve live products + stock check ───────────────────────────────────
  const liveProductIds = items.map((i) => i.liveProductId);
  const liveProducts = await prisma.liveProduct.findMany({
    where: { id: { in: liveProductIds }, status: "PUBLISHED" },
    include: { sellerProduct: true },
  });

  if (liveProducts.length !== items.length) {
    return { success: false, error: "One or more products are unavailable" };
  }

  const productMap = new Map(liveProducts.map((p) => [p.id, p]));

  // Validate stock and build line items
  for (const item of items) {
    const product = productMap.get(item.liveProductId)!;
    if (product.sellerProduct.quantity < item.quantity) {
      return {
        success: false,
        error: `Insufficient stock for "${product.title}" (requested ${item.quantity}, available ${product.sellerProduct.quantity})`,
      };
    }
  }

  // ── Build order totals ────────────────────────────────────────────────────
  const lineItems = items.map((item) => {
    const product = productMap.get(item.liveProductId)!;
    return {
      liveProductId: item.liveProductId,
      sellerProductId: product.sellerProductId,
      sellerProfileId: product.sellerProduct.sellerProfileId,
      productTitle: product.title,
      brand: product.sellerProduct.brand,
      modelName: product.sellerProduct.modelName,
      partName: product.sellerProduct.partName,
      condition: product.sellerProduct.condition,
      unitPrice: product.listingPrice,
      quantity: item.quantity,
      totalPrice: Number(product.listingPrice) * item.quantity,
    };
  });

  const subtotal = lineItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const total = subtotal; // tax/shipping calculated separately in real impl

  const addressSnapshot = {
    name: address.recipientName,
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    phone: address.phone,
  };

  const orderNumber = generateOrderNumber();

  // ── Atomic transaction ────────────────────────────────────────────────────
  const order = await prisma.$transaction(async (tx) => {
    // 1. Create Order
    const order = await tx.order.create({
      data: {
        orderNumber,
        retailerProfileId: retailer.id,
        status: "PAYMENT_PENDING",
        subtotal,
        tax: 0,
        shippingCharge: 0,
        discount: 0,
        total,
        shippingAddress: addressSnapshot,
      },
    });

    // 2. Create OrderItems
    await tx.orderItem.createMany({
      data: lineItems.map((item) => ({
        orderId: order.id,
        ...item,
      })),
    });

    // 3. Deduct stock (reserve)
    for (const item of lineItems) {
      await tx.sellerProduct.update({
        where: { id: item.sellerProductId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    // 4. Create Payment record
    await tx.payment.create({
      data: {
        orderId: order.id,
        status: "PENDING",
        method: paymentMethod,
        amount: total,
        gatewayOrderId: gatewayOrderId ?? null,
      },
    });

    // 5. Initial status history entry
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: null,
        toStatus: "PAYMENT_PENDING",
        actor: `BUYER:${session.user.id}`,
        note: "Order placed",
      },
    });

    return order;
  });

  return { success: true, data: { orderId: order.id, orderNumber: order.orderNumber } };
}

// ─── confirmPaymentAction ─────────────────────────────────────────────────────
// Called by payment webhook handler or manually by admin.
// PAYMENT_PENDING → PAYMENT_CAPTURED → CONFIRMED (combined if admin confirms directly)

export async function confirmPaymentAction(
  orderId: string,
  gatewayPaymentId: string,
  gatewaySignature: string
): Promise<ActionResult> {
  // This is called by SYSTEM (payment webhook) — no session check
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, payment: { select: { id: true } } },
  });

  if (!order) return { success: false, error: "Order not found" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId },
        data: {
          status: "CAPTURED",
          gatewayPaymentId,
          gatewaySignature,
          capturedAt: new Date(),
        },
      });

      await applyOrderTransition(tx, orderId, order.status as OrderStatus, "PAYMENT_CAPTURED", "SYSTEM", "gateway");
    });
  } catch (e) {
    if (e instanceof OrderMachineError) return { success: false, error: e.message };
    throw e;
  }

  return { success: true, data: undefined };
}

// ─── adminConfirmOrderAction ──────────────────────────────────────────────────
// Admin: PAYMENT_CAPTURED → CONFIRMED → PROCESSING

export async function adminConfirmOrderAction(
  orderId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!order) return { success: false, error: "Order not found" };

  try {
    await prisma.$transaction(async (tx) => {
      await applyOrderTransition(tx, orderId, order.status as OrderStatus, "CONFIRMED", "ADMIN", session.user.id, undefined, {
        confirmedAt: new Date(),
      });
      // Auto-advance to PROCESSING
      await applyOrderTransition(tx, orderId, "CONFIRMED", "PROCESSING", "ADMIN", session.user.id);
    });
  } catch (e) {
    if (e instanceof OrderMachineError) return { success: false, error: e.message };
    throw e;
  }

  // Notify seller(s)
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { sellerProfile: { select: { userId: true } }, productTitle: true },
  });

  const sellerUserIds = [...new Set(items.map((i) => i.sellerProfile.userId))];
  if (sellerUserIds.length > 0) {
    await prisma.notification.createMany({
      data: sellerUserIds.map((userId) => ({
        userId,
        type: "ORDER_CONFIRMED" as const,
        title: "New order to fulfill",
        message: `Order confirmed and assigned to you. Please prepare shipment.`,
        metadata: { orderId },
      })),
    });
  }

  return { success: true, data: undefined };
}

// ─── shipOrderAction ──────────────────────────────────────────────────────────
// Seller: PROCESSING → SHIPPED

const shipSchema = z.object({
  trackingNumber: z.string().min(1, "Tracking number required"),
  courierName: z.string().min(1, "Courier name required"),
});

export async function shipOrderAction(
  orderId: string,
  trackingNumber: string,
  courierName: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = shipSchema.safeParse({ trackingNumber, courierName });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!sellerProfile) return { success: false, error: "Seller profile not found" };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      items: {
        where: { sellerProfileId: sellerProfile.id },
        select: { id: true },
      },
    },
  });

  if (!order) return { success: false, error: "Order not found" };
  if (order.items.length === 0) {
    return { success: false, error: "No items in this order belong to you" };
  }

  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      // Update seller's items with tracking
      await tx.orderItem.updateMany({
        where: { orderId, sellerProfileId: sellerProfile.id },
        data: { trackingNumber: parsed.data.trackingNumber, courierName: parsed.data.courierName, shippedAt: now },
      });

      await applyOrderTransition(tx, orderId, order.status as OrderStatus, "SHIPPED", "SELLER", sellerProfile.id, undefined, {
        shippedAt: now,
      });
    });
  } catch (e) {
    if (e instanceof OrderMachineError) return { success: false, error: e.message };
    throw e;
  }

  return { success: true, data: undefined };
}

// ─── markDeliveredAction ──────────────────────────────────────────────────────
// Admin/SYSTEM: SHIPPED | OUT_FOR_DELIVERY → DELIVERED
// Creates SellerEarning rows with T+7 hold.

export async function markDeliveredAction(orderId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: {
          id: true,
          sellerProfileId: true,
          totalPrice: true,
        },
      },
    },
  });

  if (!order) return { success: false, error: "Order not found" };

  const now = new Date();
  const holdUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // T+7 days

  // Configurable commission rate — 5% default
  const COMMISSION_RATE = 0.05;

  try {
    await prisma.$transaction(async (tx) => {
      await applyOrderTransition(tx, orderId, order.status as OrderStatus, "DELIVERED", "ADMIN", session.user.id, undefined, {
        deliveredAt: now,
      });

      // Update item delivery timestamps
      await tx.orderItem.updateMany({
        where: { orderId },
        data: { deliveredAt: now },
      });

      // Create SellerEarning (ON_HOLD) for each item
      await tx.sellerEarning.createMany({
        data: order.items.map((item) => {
          const gross = Number(item.totalPrice);
          const commission = parseFloat((gross * COMMISSION_RATE).toFixed(2));
          const net = parseFloat((gross - commission).toFixed(2));
          return {
            orderItemId: item.id,
            sellerProfileId: item.sellerProfileId,
            grossAmount: gross,
            commission,
            netAmount: net,
            status: "ON_HOLD" as const,
            holdUntil,
          };
        }),
        skipDuplicates: true,
      });
    });
  } catch (e) {
    if (e instanceof OrderMachineError) return { success: false, error: e.message };
    throw e;
  }

  return { success: true, data: undefined };
}

// ─── cancelOrderAction ────────────────────────────────────────────────────────
// Buyer / Seller / Admin cancel — validates machine + restores stock + initiates refund.

export async function cancelOrderAction(
  orderId: string,
  note: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = session.user.role;
  const actor: OrderActor =
    role === "ADMIN" ? "ADMIN" : role === "SELLER" ? "SELLER" : "BUYER";

  if (!note.trim()) return { success: false, error: "Cancellation reason is required" };

  const cancelledBy: CancelledBy =
    actor === "ADMIN" ? "ADMIN" : actor === "SELLER" ? "SELLER" : "BUYER";

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { select: { id: true, sellerProductId: true, quantity: true } },
      payment: { select: { id: true, status: true, amount: true } },
    },
  });

  if (!order) return { success: false, error: "Order not found" };

  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      await applyOrderTransition(tx, orderId, order.status as OrderStatus, "CANCELLED", actor, session.user.id, note, {
        cancelledAt: now,
        cancelledBy,
        cancellationNote: note,
      });

      // Restore stock for each item
      for (const item of order.items) {
        await tx.sellerProduct.update({
          where: { id: item.sellerProductId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      // Initiate refund if payment was captured
      if (order.payment && order.payment.status === "CAPTURED") {
        await tx.refund.create({
          data: {
            paymentId: order.payment.id,
            amount: order.payment.amount,
            status: "INITIATED",
          },
        });

        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: "FULLY_REFUNDED" },
        });
      }
    });
  } catch (e) {
    if (e instanceof OrderMachineError) return { success: false, error: e.message };
    throw e;
  }

  return { success: true, data: undefined };
}
