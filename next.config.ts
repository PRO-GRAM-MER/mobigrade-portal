import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// ─── Content Security Policy ─────────────────────────────────────────────────
// Controls which origins the browser trusts for each resource type.
// Adjust 'connect-src' when adding new third-party APIs.

const CSP = [
  "default-src 'self'",
  // Scripts: Next.js inlines a small bootstrap script + Vercel Speed Insights
  "script-src 'self' 'unsafe-inline' https://vercel.live",
  // Styles: Tailwind inlines utility classes in dev; keep 'unsafe-inline' for now
  "style-src 'self' 'unsafe-inline'",
  // Images: allow Cloudinary CDN + data URIs (for image placeholders)
  "img-src 'self' data: blob: https://res.cloudinary.com",
  // Fonts: self-hosted only (no Google Fonts)
  "font-src 'self'",
  // API calls + Sentry + Vercel Analytics
  "connect-src 'self' https://o*.ingest.sentry.io https://vitals.vercel-insights.com https://api.vercel.com",
  // Uploads go directly to Cloudinary
  "form-action 'self' https://api.cloudinary.com",
  // No embedding in iframes
  "frame-ancestors 'none'",
  // No plugins
  "object-src 'none'",
  // Upgrade HTTP → HTTPS
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",   value: "on" },
  { key: "X-Frame-Options",          value: "DENY" },
  { key: "X-Content-Type-Options",   value: "nosniff" },
  { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: CSP,
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry org and project (set in environment or .env.local)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps when SENTRY_AUTH_TOKEN is set (CI/prod builds only)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Source maps are uploaded then deleted from the build output
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Silent during local development; verbose in CI
  silent: process.env.NODE_ENV !== "production",

  // Disable Sentry completely if DSN is not configured (safe default for local dev)
  disableLogger: true,
});
