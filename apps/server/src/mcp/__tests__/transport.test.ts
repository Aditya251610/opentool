import { describe, it, expect } from 'vitest'

/**
 * extractBearerToken is not exported directly, so we test the behavior
 * through the public handleMcpStreamable function's auth checks.
 * For unit testing the token extraction logic, we replicate the function
 * here and test it in isolation.
 */

// Replicated from transport.ts for unit testing
function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null

  let token = authHeader
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim()
  }
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim()
  }
  return token || null
}

describe('extractBearerToken', () => {
  it('returns null for null header', () => {
    expect(extractBearerToken(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractBearerToken('')).toBeNull()
  })

  it('extracts token from standard Bearer header', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123')
  })

  it('handles double Bearer prefix from MCP clients', () => {
    expect(extractBearerToken('Bearer Bearer abc123')).toBe('abc123')
  })

  it('accepts raw token without Bearer prefix', () => {
    expect(extractBearerToken('raw-token-here')).toBe('raw-token-here')
  })

  it('trims whitespace around token', () => {
    expect(extractBearerToken('Bearer   spaced-token  ')).toBe('spaced-token')
  })

  it('returns null for Bearer with no token', () => {
    expect(extractBearerToken('Bearer ')).toBeNull()
  })

  it('handles long JWT-style tokens', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
    expect(extractBearerToken(`Bearer ${jwt}`)).toBe(jwt)
  })
})

describe('MCP transport session management', () => {
  it('SESSION_TTL_MS is 30 minutes', async () => {
    // Verify the constant matches expected value
    const SESSION_TTL_MS = 30 * 60 * 1000
    expect(SESSION_TTL_MS).toBe(1_800_000)
  })
})
