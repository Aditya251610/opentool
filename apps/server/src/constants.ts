/**
 * Application-wide constants — no magic numbers or strings in business logic.
 */

// ─── Supported Providers ──────────────────
export const PROVIDERS = [
  'github', 'notion', 'slack', 'linear',
  'gmail', 'gcal', 'stripe', 'vercel',
  'resend', 'postgres',
] as const
export type Provider = typeof PROVIDERS[number]

// ─── Cache ────────────────────────────────
export const CACHE_KEY_PREFIX = 'ot:token'
export const TOKEN_CACHE_DEFAULT_TTL = 3600

// ─── OAuth ────────────────────────────────
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000
export const COMMA_SCOPE_PROVIDERS: Provider[] = ['linear', 'slack']

// ─── Crypto ───────────────────────────────
export const AES_ALGORITHM = 'aes-256-gcm'
export const IV_LENGTH = 12
export const TAG_LENGTH = 16
export const API_KEY_PREFIX = 'ot_'

// ─── Auth ─────────────────────────────────
export const BCRYPT_ROUNDS = 12
export const PASSWORD_MIN_LENGTH = 8

// ─── Pagination ───────────────────────────
export const MAX_PAGE_SIZE = 100
export const DEFAULT_PAGE_SIZE = 25

// ─── Rate Limiting ────────────────────────
export const AUTH_RATE_LIMIT_WINDOW_MS = 60_000
export const AUTH_RATE_LIMIT_MAX = 20

// ─── Provider → Env Var mapping (API key auth) ──
export const API_KEY_ENV_MAP: Record<string, string> = {
  resend: 'RESEND_API_KEY',
  postgres: 'POSTGRES_CONNECTION_STRING',
} as const
