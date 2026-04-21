/**
 * Structured logger for MobiGrade Portal.
 *
 * - Development: human-readable coloured output to stdout
 * - Production:  JSON lines to stdout (Vercel captures & indexes these)
 *
 * Usage:
 *   import { logger } from "@/lib/logger"
 *   const log = logger("kyc-actions")
 *
 *   log.info("KYC submitted", { userId, sellerProfileId })
 *   log.warn("Re-submission with existing assets", { publicIds })
 *   log.error("Transaction failed", { error, userId })
 */

type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

interface LogEntry {
  ts: string;
  level: LogLevel;
  module: string;
  msg: string;
  [key: string]: unknown;
}

const IS_PROD = process.env.NODE_ENV === "production";

// ANSI colours for dev only
const COLOURS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info:  "\x1b[32m", // green
  warn:  "\x1b[33m", // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

function write(level: LogLevel, module: string, msg: string, ctx?: LogContext) {
  const ts = new Date().toISOString();

  if (IS_PROD) {
    const entry: LogEntry = { ts, level, module, msg, ...ctx };
    // Vercel captures stdout JSON lines and makes them searchable in the dashboard
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    const colour = COLOURS[level];
    const tag = `${colour}[${level.toUpperCase()}]${RESET}`;
    const meta = ctx && Object.keys(ctx).length ? " " + JSON.stringify(ctx) : "";
    console.log(`${ts} ${tag} [${module}] ${msg}${meta}`);
  }
}

export function logger(module: string) {
  return {
    debug: (msg: string, ctx?: LogContext) => write("debug", module, msg, ctx),
    info:  (msg: string, ctx?: LogContext) => write("info",  module, msg, ctx),
    warn:  (msg: string, ctx?: LogContext) => write("warn",  module, msg, ctx),
    error: (msg: string, ctx?: LogContext) => write("error", module, msg, ctx),
  };
}
