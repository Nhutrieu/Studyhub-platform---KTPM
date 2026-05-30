/**
 * Logger utility for consistent logging across the application
 * In production, only errors are logged
 */

type LogLevel = "log" | "warn" | "error";

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log("[LOG]", ...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn("[WARN]", ...args);
    }
  },

  error: (...args: unknown[]) => {
    // Always log errors, even in production
    console.error("[ERROR]", ...args);
  },

  // Helper for API errors
  apiError: (error: unknown, context?: string) => {
    const message = error instanceof Error ? error.message : String(error);
    const contextMsg = context ? `[${context}]` : "";
    logger.error(`${contextMsg} ${message}`, error);
  },
};

