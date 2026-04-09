/**
 * Structured JSON logger — replaces all console.log/error across the server.
 * Every log entry includes level, message, timestamp, and optional metadata.
 * Sensitive data (tokens, keys, secrets) must NEVER appear in log metadata.
 */

import { config } from './config'

function isError(value: unknown): value is Error {
  return value instanceof Error
}

function formatEntry(level: string, msg: string, meta?: Record<string, unknown>): string {
  return JSON.stringify({
    level,
    msg,
    ...meta,
    ts: new Date().toISOString(),
  })
}

export const logger = {
  info(msg: string, meta?: Record<string, unknown>): void {
    console.log(formatEntry('info', msg, meta))
  },

  warn(msg: string, meta?: Record<string, unknown>): void {
    console.warn(formatEntry('warn', msg, meta))
  },

  error(msg: string, error?: unknown, meta?: Record<string, unknown>): void {
    const errorInfo = isError(error)
      ? { errorMessage: error.message, errorStack: error.stack }
      : error !== undefined
        ? { errorMessage: String(error) }
        : {}
    console.error(formatEntry('error', msg, { ...errorInfo, ...meta }))
  },

  debug(msg: string, meta?: Record<string, unknown>): void {
    if (config.nodeEnv !== 'production') {
      console.log(formatEntry('debug', msg, meta))
    }
  },
}
