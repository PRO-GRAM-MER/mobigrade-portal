import { confirmPaymentAction } from "@/actions/order-actions";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";

// POST /api/payments/webhook
// Handles Razorpay payment.captured events.
// Webhook signature verification is mandatory — never skip in production.

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  // ── Signature verification ────────────────────────────────────────────────
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] RAZORPAY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── Parse event ───────────────────────────────────────────────────────────
  let event: {
    event: string;
    payload: {
      payment: {
        entity: {
          id: string;
          order_id: string;
          status: string;
        };
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Handle payment.captured ───────────────────────────────────────────────
  if (event.event === "payment.captured") {
    const { id: gatewayPaymentId, order_id: gatewayOrderId } =
      event.payload.payment.entity;

    // Find our Order by the gateway order ID stored in Payment
    const payment = await prisma.payment.findFirst({
      where: { gatewayOrderId },
      select: { orderId: true },
    });

    if (!payment) {
      // Log and return 200 — don't retry unknown orders
      console.warn(`[webhook] No order found for gatewayOrderId: ${gatewayOrderId}`);
      return NextResponse.json({ received: true });
    }

    const result = await confirmPaymentAction(
      payment.orderId,
      gatewayPaymentId,
      signature
    );

    if (!result.success) {
      console.error(`[webhook] confirmPayment failed: ${result.error}`);
      // Return 422 so Razorpay retries
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
  }

  // Acknowledge all other events without processing
  return NextResponse.json({ received: true });
}
