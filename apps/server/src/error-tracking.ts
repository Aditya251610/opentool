import { logger } from './logger'
import { config } from './config'

/**
 * Lightweight error tracking that reports to Sentry via HTTP API when configured.
 * Falls back to logger.error when SENTRY_DSN is not set.
 * Uses Sentry's envelope API directly — no SDK dependency.
 */

interface ErrorContext {
  userId?: string
  provider?: string
  toolId?: string
  operation?: string
  [key: string]: unknown
}

let sentryDsn: URL | null = null
let sentryProjectId: string = ''
let sentryPublicKey: string = ''

function initSentry() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return

  try {
    sentryDsn = new URL(dsn)
    sentryProjectId = sentryDsn.pathname.replace('/', '')
    sentryPublicKey = sentryDsn.username
    logger.info('Error tracking initialized', { project: sentryProjectId })
  } catch {
    logger.warn('Invalid SENTRY_DSN, error tracking disabled')
  }
}

// Initialize on import
initSentry()

/**
 * Capture an exception and send it to Sentry (if configured).
 * Always logs the error regardless of Sentry config.
 */
export function captureException(error: Error, context: ErrorContext = {}): void {
  // Always log
  logger.error('Captured exception', error, {
    context,
  })

  if (!sentryDsn) return

  // Send to Sentry via store endpoint (fire and forget)
  const payload = {
    exception: {
      values: [
        {
          type: error.name,
          value: error.message,
          stacktrace: error.stack ? { frames: parseStack(error.stack) } : undefined,
        },
      ],
    },
    tags: {
      provider: context.provider,
      toolId: context.toolId,
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: context,
    platform: 'node',
    timestamp: Date.now() / 1000,
  }

  const url = `https://${sentryDsn.host}/api/${sentryProjectId}/store/`

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${sentryPublicKey}`,
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Silently fail — don't let error tracking cause errors
  })
}

function parseStack(stack: string): Array<{ filename: string; lineno: number; function: string }> {
  return stack
    .split('\n')
    .slice(1)
    .map((line) => {
      const match = line.match(/at (\S+) \((.+):(\d+):\d+\)/)
      if (match) {
        return { function: match[1], filename: match[2], lineno: parseInt(match[3]) }
      }
      const match2 = line.match(/at (.+):(\d+):\d+/)
      if (match2) {
        return { function: '<anonymous>', filename: match2[1], lineno: parseInt(match2[2]) }
      }
      return { function: '<unknown>', filename: '<unknown>', lineno: 0 }
    })
    .filter((f) => f.filename !== '<unknown>')
}

/**
 * Add a breadcrumb for debugging context.
 * Only useful when Sentry is connected; otherwise just logs at debug level.
 */
export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  logger.debug(message, data)
}
