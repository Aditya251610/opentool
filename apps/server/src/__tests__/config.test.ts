import { describe, it, expect } from 'vitest'
import { config, getApiKeyForProvider } from '../config'

describe('config', () => {
  it('exports a frozen config object', () => {
    expect(config).toBeDefined()
    expect(typeof config.databaseUrl).toBe('string')
    expect(typeof config.redisUrl).toBe('string')
    expect(typeof config.encryptionKey).toBe('string')
  })

  it('encryptionKey is 64 hex characters', () => {
    expect(config.encryptionKey).toMatch(/^[0-9a-fA-F]{64}$/)
  })

  it('has sensible defaults for optional fields', () => {
    expect(config.port).toBe(3001)
    expect(config.nodeEnv).toBeDefined()
    expect(['development', 'production', 'test']).toContain(config.nodeEnv)
  })

  it('serverUrl defaults to localhost', () => {
    // In test env without SERVER_URL set
    expect(config.serverUrl).toContain('localhost')
  })

  it('postgresAllowedHosts is an array', () => {
    expect(Array.isArray(config.postgresAllowedHosts)).toBe(true)
  })
})

describe('getApiKeyForProvider', () => {
  it('returns undefined for unknown provider', () => {
    expect(getApiKeyForProvider('unknown_provider')).toBeUndefined()
  })

  it('maps resend to RESEND_API_KEY env var', () => {
    const original = process.env.RESEND_API_KEY
    process.env.RESEND_API_KEY = 'test_resend_key'
    expect(getApiKeyForProvider('resend')).toBe('test_resend_key')
    if (original) process.env.RESEND_API_KEY = original
    else delete process.env.RESEND_API_KEY
  })

  it('maps postgres to POSTGRES_CONNECTION_STRING env var', () => {
    const original = process.env.POSTGRES_CONNECTION_STRING
    process.env.POSTGRES_CONNECTION_STRING = 'postgres://test'
    expect(getApiKeyForProvider('postgres')).toBe('postgres://test')
    if (original) process.env.POSTGRES_CONNECTION_STRING = original
    else delete process.env.POSTGRES_CONNECTION_STRING
  })

  it('returns undefined when env var is not set', () => {
    const original = process.env.RESEND_API_KEY
    delete process.env.RESEND_API_KEY
    expect(getApiKeyForProvider('resend')).toBeUndefined()
    if (original) process.env.RESEND_API_KEY = original
  })
})
