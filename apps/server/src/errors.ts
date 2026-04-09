/**
 * Typed error classes for structured error handling across the server.
 * Route handlers use `instanceof` checks to map errors to HTTP status codes.
 */

/** Thrown when a tool requires authentication the user hasn't completed. */
export class AuthRequiredError extends Error {
  readonly provider: string
  readonly authUrl: string
  readonly authType: 'oauth2' | 'api_key'

  constructor(provider: string, authUrl: string, authType: 'oauth2' | 'api_key' = 'oauth2') {
    super(`Authentication required for ${provider}`)
    this.name = 'AuthRequiredError'
    this.provider = provider
    this.authUrl = authUrl
    this.authType = authType
  }
}

/** Thrown when a tool ID doesn't exist in the registry. */
export class ToolNotFoundError extends Error {
  readonly toolId: string

  constructor(toolId: string) {
    super(`Tool not found: ${toolId}`)
    this.name = 'ToolNotFoundError'
    this.toolId = toolId
  }
}

/** Thrown when a provider slug is unknown. */
export class ProviderNotFoundError extends Error {
  readonly provider: string

  constructor(provider: string) {
    super(`Unknown provider: ${provider}`)
    this.name = 'ProviderNotFoundError'
    this.provider = provider
  }
}

/** Thrown when a token has expired and refresh failed. */
export class TokenExpiredError extends Error {
  readonly provider: string

  constructor(provider: string) {
    super(`Token expired for ${provider} and refresh failed`)
    this.name = 'TokenExpiredError'
    this.provider = provider
  }
}

/** Thrown when request input fails validation. */
export class ValidationError extends Error {
  readonly field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

/**
 * Maps a caught error to an HTTP status code and message for route handlers.
 * Usage: `const { status, body } = mapErrorToResponse(error)`
 */
export function mapErrorToResponse(error: unknown): { status: number; body: { error: string; authUrl?: string } } {
  if (error instanceof ValidationError) {
    return { status: 400, body: { error: error.message } }
  }
  if (error instanceof AuthRequiredError) {
    return { status: 401, body: { error: error.message, authUrl: error.authUrl } }
  }
  if (error instanceof ToolNotFoundError) {
    return { status: 404, body: { error: error.message } }
  }
  if (error instanceof ProviderNotFoundError) {
    return { status: 404, body: { error: error.message } }
  }
  if (error instanceof TokenExpiredError) {
    return { status: 401, body: { error: error.message } }
  }
  const message = error instanceof Error ? error.message : 'Internal server error'
  return { status: 500, body: { error: message } }
}
