/**
 * Order State Machine
 *
 * All valid transitions are defined as data — not spread across if/switch blocks.
 * This means:
 *   - Adding a new transition = one line in TRANSITIONS
 *   - Audit of "who can do what" = read TRANSITIONS
 *   - Zero business logic duplication between API routes and server actions
 *
 * This file has NO imports. It is pure, synchronous, and testable in isolation.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "PAYMENT_CAPTURED"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_IN_PROGRESS"
  | "COMPLETED";

export type OrderActor = "BUYER" | "SELLER" | "ADMIN" | "SYSTEM";

interface Transition {
  from: OrderStatus;
  to: OrderStatus;
  actors: OrderActor[];
  /** If true, the caller MUST supply a non-empty note */
  requiresNote: boolean;
}

// ─── Transition table ─────────────────────────────────────────────────────────
//
// Read each row as: "from {from}, {actors} can move to {to}"
//
// Cancellation rules:
//   BUYER  — can cancel up to CONFIRMED (before seller starts packing)
//   SELLER — can cancel at PROCESSING only (with reason — affects their rating)
//   ADMIN  — can cancel anything pre-SHIPPED

export const ORDER_TRANSITIONS: Transition[] = [
  // Payment gateway → order status
  { from: "PAYMENT_PENDING",    to: "PAYMENT_CAPTURED",   actors: ["SYSTEM"],              requiresNote: false },
  { from: "PAYMENT_PENDING",    to: "PAYMENT_FAILED",     actors: ["SYSTEM"],              requiresNote: false },
  { from: "PAYMENT_FAILED",     to: "PAYMENT_PENDING",    actors: ["BUYER"],               requiresNote: false }, // retry

  // Admin confirms valid payment
  { from: "PAYMENT_CAPTURED",   to: "CONFIRMED",          actors: ["ADMIN"],               requiresNote: false },
  { from: "PAYMENT_CAPTURED",   to: "CANCELLED",          actors: ["ADMIN", "BUYER"],      requiresNote: true  }, // pre-confirm cancel

  // Admin releases to seller queue
  { from: "CONFIRMED",          to: "PROCESSING",         actors: ["ADMIN", "SYSTEM"],     requiresNote: false },
  { from: "CONFIRMED",          to: "CANCELLED",          actors: ["ADMIN", "BUYER"],      requiresNote: true  },

  // Seller fulfillment
  { from: "PROCESSING",         to: "SHIPPED",            actors: ["SELLER"],              requiresNote: false },
  { from: "PROCESSING",         to: "CANCELLED",          actors: ["ADMIN", "SELLER"],     requiresNote: true  }, // stock issue etc.

  // Logistics
  { from: "SHIPPED",            to: "OUT_FOR_DELIVERY",   actors: ["SYSTEM", "ADMIN"],     requiresNote: false },
  { from: "SHIPPED",            to: "DELIVERED",          actors: ["SYSTEM", "ADMIN"],     requiresNote: false }, // skip OFD if not applicable
  { from: "OUT_FOR_DELIVERY",   to: "DELIVERED",          actors: ["SYSTEM", "ADMIN"],     requiresNote: false },

  // Post-delivery
  { from: "DELIVERED",          to: "RETURN_IN_PROGRESS", actors: ["BUYER"],               requiresNote: false },
  { from: "DELIVERED",          to: "COMPLETED",          actors: ["SYSTEM"],              requiresNote: false }, // auto after return window
  { from: "RETURN_IN_PROGRESS", to: "COMPLETED",          actors: ["SYSTEM", "ADMIN"],     requiresNote: false },
];

// ─── Terminal states — no outbound transitions ────────────────────────────────
export const TERMINAL_STATES: OrderStatus[] = ["CANCELLED", "COMPLETED"];

// ─── Error ────────────────────────────────────────────────────────────────────

export class OrderMachineError extends Error {
  constructor(
    message: string,
    public readonly from: OrderStatus,
    public readonly to: OrderStatus,
    public readonly actor: OrderActor
  ) {
    super(message);
    this.name = "OrderMachineError";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findTransition(
  from: OrderStatus,
  to: OrderStatus
): Transition | undefined {
  return ORDER_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns true if the transition is valid AND the actor is authorized.
 */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: OrderActor
): boolean {
  const t = findTransition(from, to);
  return !!t && t.actors.includes(actor);
}

/**
 * Throws OrderMachineError with a precise message if the transition is
 * invalid OR the actor is not authorized.
 * Use this inside server actions / route handlers.
 */
export function assertTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: OrderActor,
  note?: string
): void {
  const t = findTransition(from, to);

  if (!t) {
    throw new OrderMachineError(
      `No transition exists: ${from} → ${to}`,
      from,
      to,
      actor
    );
  }

  if (!t.actors.includes(actor)) {
    throw new OrderMachineError(
      `${actor} is not allowed to transition ${from} → ${to}. Allowed actors: ${t.actors.join(", ")}`,
      from,
      to,
      actor
    );
  }

  if (t.requiresNote && (!note || !note.trim())) {
    throw new OrderMachineError(
      `Transition ${from} → ${to} requires a note (reason)`,
      from,
      to,
      actor
    );
  }
}

/**
 * Returns all states reachable from `status` by `actor`.
 * Useful for building UI action buttons.
 */
export function getAvailableTransitions(
  status: OrderStatus,
  actor: OrderActor
): OrderStatus[] {
  return ORDER_TRANSITIONS.filter(
    (t) => t.from === status && t.actors.includes(actor)
  ).map((t) => t.to);
}

/**
 * Returns true if this transition requires a note/reason from the caller.
 */
export function transitionRequiresNote(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return findTransition(from, to)?.requiresNote ?? false;
}
