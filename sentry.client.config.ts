// Sentry browser-side initialisation.
// This file is auto-loaded by Next.js before the app boots in the browser.
// Set NEXT_PUBLIC_SENTRY_DSN in your environment (Vercel dashboard / .env.local).

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of sessions for performance tracing in prod; 100% in dev.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture 10% of sessions for Session Replay.
  replaysSessionSampleRate: 0.1,
  // Always replay sessions that include an error.
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Silence in development unless DSN is set.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
