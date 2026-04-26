import { logger } from '../src/logger'

/**
 * Wraps an external API error with a generic user-facing message.
 * Logs the full error server-side for debugging.
 */
export function safeToolError(error: unknown, provider: string, operation: string): Error {
  // Extract the most useful info from the error
  let detail = ''
  if (error && typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    detail = (errObj.message || errObj.error || errObj.error_description || '') as string
  } else if (typeof error === 'string') {
    detail = error
  } else if (error instanceof Error) {
    detail = error.message
  }

  // Log full error server-side
  logger.error('Tool execution failed', {
    provider,
    operation,
    errorMessage: detail,
    errorStack: error instanceof Error ? error.stack : undefined,
  })

  // Return actionable message for AI agents
  return new Error(
    `${provider} ${operation} failed: ${detail || 'unknown error'}. ` +
      `Try checking your input parameters or retry the request.`,
  )
}

/**
 * Wraps a fetch call to an external API with error handling.
 * Returns the response if ok, otherwise logs and throws a safe error.
 */
export async function safeFetch(
  url: string,
  options: RequestInit,
  provider: string,
  operation: string,
): Promise<Response> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    logger.error(`${provider} API error`, {
      provider,
      operation,
      status: res.status,
      statusText: res.statusText,
      bodyPreview: text.substring(0, 500), // truncate for safety
    })
    throw new Error(
      `${provider} ${operation} failed (HTTP ${res.status}${res.status === 401 ? ' — authentication expired, reconnect your account' : res.status === 403 ? ' — insufficient permissions, check required scopes' : res.status === 404 ? ' — resource not found, verify the ID/name' : res.status === 429 ? ' — rate limited, wait and retry' : ''}). ${text ? `API response: ${text.substring(0, 200)}` : 'No response body.'}`,
    )
  }
  return res
}

// ─── Retry & Timeout ──────────────────────

export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  timeoutMs?: number
}

/**
 * Fetches from a URL with automatic retry on 429/5xx errors and timeout handling.
 * Implements exponential backoff with jitter and respects Retry-After headers.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  provider: string,
  operation: string,
  retryOpts: RetryOptions = {},
): Promise<Response> {
  const { maxRetries = 2, baseDelayMs = 1000, timeoutMs = 25000 } = retryOpts

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeout)

      // Retry on 429 or 5xx
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        const retryAfter = res.headers.get('retry-after')
        const delay = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, 10000)
          : baseDelayMs * Math.pow(2, attempt)

        logger.warn('Retrying tool API call', {
          provider,
          operation,
          status: res.status,
          attempt,
          delay,
        })
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        logger.error(`${provider} API error`, {
          provider,
          operation,
          status: res.status,
          body: text.substring(0, 500),
        })
        throw new Error(
          `${provider} ${operation} failed (HTTP ${res.status}${res.status === 401 ? ' — authentication expired, reconnect your account' : res.status === 403 ? ' — insufficient permissions' : res.status === 404 ? ' — resource not found' : ''}). ${text ? text.substring(0, 200) : ''}`,
        )
      }

      return res
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (attempt < maxRetries) {
          logger.warn('Tool API call timed out, retrying', {
            provider,
            operation,
            attempt,
          })
          continue
        }
        throw new Error(`${provider} ${operation} timed out after ${timeoutMs}ms`)
      }
      if (attempt < maxRetries && !(error instanceof Error && error.message.includes('failed ('))) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        logger.warn('Retrying after error', {
          provider,
          operation,
          attempt,
          error: String(error),
        })
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }

  throw new Error(`${provider} ${operation} failed after ${maxRetries + 1} attempts`)
}
