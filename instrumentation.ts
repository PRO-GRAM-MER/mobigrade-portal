// Next.js instrumentation hook — runs once when the server starts.
// Used by @sentry/nextjs to wire up server-side error tracking.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture unhandled errors in server components and API routes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onRequestError = async (err: unknown, request: any, context: any) => {
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(err, request, context);
};
