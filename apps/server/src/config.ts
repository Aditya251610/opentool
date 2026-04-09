/**
 * Centralized configuration — single source of truth for all environment variables.
 * Validates required vars at import time (fail-fast at startup).
 */

const required = ['DATABASE_URL', 'REDIS_URL', 'TOKEN_ENCRYPTION_KEY'] as const

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`)
  }
}

// TOKEN_ENCRYPTION_KEY must be exactly 64 hex chars (32 bytes for AES-256)
const encryptionKey = process.env['TOKEN_ENCRYPTION_KEY']!
if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
  throw new Error('TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)')
}

export const config = {
  databaseUrl: process.env['DATABASE_URL']!,
  redisUrl: process.env['REDIS_URL']!,
  encryptionKey,
  serverUrl: process.env['SERVER_URL'] ?? 'http://localhost:3001',
  dashboardUrl: process.env['DASHBOARD_URL'] ?? 'http://localhost:3000',
  nodeEnv: (process.env['NODE_ENV'] ?? 'development') as 'development' | 'production' | 'test',
  port: Number(process.env['PORT'] ?? 3001),
} as const

/**
 * Get API key for a provider from environment.
 * Safely reads from pre-validated API_KEY_ENV_MAP.
 */
export function getApiKeyForProvider(provider: string): string | undefined {
  const API_KEY_ENV_MAP: Record<string, string> = {
    resend: 'RESEND_API_KEY',
    postgres: 'POSTGRES_CONNECTION_STRING',
  }
  const envVar = API_KEY_ENV_MAP[provider]
  return envVar ? process.env[envVar] : undefined
}
