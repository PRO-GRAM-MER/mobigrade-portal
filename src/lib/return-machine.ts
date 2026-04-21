/**
 * Return Request State Machine
 *
 * Same pattern as order-machine.ts — transitions as data, pure module.
 * Return lifecycle is separate from Order lifecycle:
 *   Order.status = RETURN_IN_PROGRESS (a single denormalized flag)
 *   ReturnRequest.status = the actual granular state
 */

export type ReturnStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "PICKUP_SCHEDULED"
  | "PICKED_UP"
  | "RECEIVED"
  | "CLOSED";

export type ReturnActor = "BUYER" | "ADMIN" | "SYSTEM";

interface ReturnTransition {
  from: ReturnStatus;
  to: ReturnStatus;
  actors: ReturnActor[];
  requiresNote: boolean;
}

export const RETURN_TRANSITIONS: ReturnTransition[] = [
  // Admin reviews the request
  { from: "REQUESTED",        to: "APPROVED",          actors: ["ADMIN"],           requiresNote: false },
  { from: "REQUESTED",        to: "REJECTED",          actors: ["ADMIN"],           requiresNote: true  },

  // Logistics coordination
  { from: "APPROVED",         to: "PICKUP_SCHEDULED",  actors: ["ADMIN"],           requiresNote: false },
  { from: "PICKUP_SCHEDULED", to: "PICKED_UP",         actors: ["ADMIN", "SYSTEM"], requiresNote: false },
  { from: "PICKED_UP",        to: "RECEIVED",          actors: ["ADMIN"],           requiresNote: false },

  // Close — admin closes after deciding on refund
  { from: "RECEIVED",         to: "CLOSED",            actors: ["ADMIN"],           requiresNote: false },

  // Auto-close rejected requests
  { from: "REJECTED",         to: "CLOSED",            actors: ["SYSTEM"],          requiresNote: false },
];

export const RETURN_TERMINAL_STATES: ReturnStatus[] = ["CLOSED"];

// ─── Error ────────────────────────────────────────────────────────────────────

export class ReturnMachineError extends Error {
  constructor(
    message: string,
    public readonly from: ReturnStatus,
    public readonly to: ReturnStatus,
    public readonly actor: ReturnActor
  ) {
    super(message);
    this.name = "ReturnMachineError";
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

function findReturnTransition(
  from: ReturnStatus,
  to: ReturnStatus
): ReturnTransition | undefined {
  return RETURN_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

export function canReturnTransition(
  from: ReturnStatus,
  to: ReturnStatus,
  actor: ReturnActor
): boolean {
  const t = findReturnTransition(from, to);
  return !!t && t.actors.includes(actor);
}

export function assertReturnTransition(
  from: ReturnStatus,
  to: ReturnStatus,
  actor: ReturnActor,
  note?: string
): void {
  const t = findReturnTransition(from, to);

  if (!t) {
    throw new ReturnMachineError(
      `No return transition exists: ${from} → ${to}`,
      from,
      to,
      actor
    );
  }

  if (!t.actors.includes(actor)) {
    throw new ReturnMachineError(
      `${actor} cannot transition return ${from} → ${to}. Allowed: ${t.actors.join(", ")}`,
      from,
      to,
      actor
    );
  }

  if (t.requiresNote && (!note || !note.trim())) {
    throw new ReturnMachineError(
      `Return transition ${from} → ${to} requires a rejection note`,
      from,
      to,
      actor
    );
  }
}

export function getAvailableReturnTransitions(
  status: ReturnStatus,
  actor: ReturnActor
): ReturnStatus[] {
  return RETURN_TRANSITIONS.filter(
    (t) => t.from === status && t.actors.includes(actor)
  ).map((t) => t.to);
}
