import { describe, it, expect } from 'vitest'
import { sanitizeInput, sanitizeOutput } from '../tools'

describe('sanitizeInput', () => {
  it('should redact password fields', () => {
    const input = { username: 'john', password: 'secret123' }
    const result = sanitizeInput(input)
    expect(result).toEqual({
      username: 'john',
      password: '[REDACTED]',
    })
  })

  it('should redact api_key case-insensitively', () => {
    const input = { apiKey: 'sk_live_123', data: 'value' }
    const result = sanitizeInput(input)
    expect(result).toEqual({
      apiKey: '[REDACTED]',
      data: 'value',
    })
  })

  it('should redact connection_string (snake_case)', () => {
    const input = { connection_string: 'postgresql://user:pass@host/db' }
    const result = sanitizeInput(input)
    expect(result).toEqual({
      connection_string: '[REDACTED]',
    })
  })

  it('should redact accessToken and access_token variants', () => {
    const input1 = { accessToken: 'token123' }
    const input2 = { access_token: 'token456' }
    const input3 = { access_token_value: 'token789' } // different key
    
    expect(sanitizeInput(input1)).toEqual({ accessToken: '[REDACTED]' })
    expect(sanitizeInput(input2)).toEqual({ access_token: '[REDACTED]' })
    expect(sanitizeInput(input3)).toEqual({ access_token_value: 'token789' }) // not redacted, different key
  })

  it('should handle nested objects recursively', () => {
    const input = {
      user: {
        name: 'John',
        auth: {
          password: 'secret',
          apiKey: 'key123',
        },
      },
      config: {
        token: 'abc123',
      },
    }
    const result = sanitizeInput(input)
    expect(result).toEqual({
      user: {
        name: 'John',
        auth: {
          password: '[REDACTED]',
          apiKey: '[REDACTED]',
        },
      },
      config: {
        token: '[REDACTED]',
      },
    })
  })

  it('should pass through non-sensitive fields', () => {
    const input = {
      email: 'user@example.com',
      name: 'John Doe',
      age: 30,
      active: true,
    }
    const result = sanitizeInput(input)
    expect(result).toEqual(input)
  })

  it('should handle null input', () => {
    const result = sanitizeInput(null)
    expect(result).toBeNull()
  })

  it('should handle undefined input', () => {
    const result = sanitizeInput(undefined)
    expect(result).toBeUndefined()
  })

  it('should handle primitive types', () => {
    expect(sanitizeInput('string')).toBe('string')
    expect(sanitizeInput(123)).toBe(123)
    expect(sanitizeInput(true)).toBe(true)
  })

  it('should handle arrays in objects', () => {
    const input = {
      users: [{ name: 'Alice', password: 'pass1' }],
      tokens: ['token1', 'token2'],
    }
    // Note: Arrays are treated as objects with numeric keys
    // The inner object { name: 'Alice', password: 'pass1' } gets recursively sanitized
    const result = sanitizeInput(input)
    expect(result).toEqual({
      users: { 0: { name: 'Alice', password: '[REDACTED]' } },
      tokens: { 0: 'token1', 1: 'token2' },
    })
  })

  it('should redact client_secret (snake_case variant)', () => {
    const input = { client_secret: 'secret_value' }
    const result = sanitizeInput(input)
    expect(result).toEqual({ client_secret: '[REDACTED]' })
  })

  it('should redact privateKey (camelCase variant)', () => {
    const input = { privateKey: 'private_key_data' }
    const result = sanitizeInput(input)
    expect(result).toEqual({ privateKey: '[REDACTED]' })
  })
})

describe('sanitizeOutput', () => {
  it('should redact sensitive fields in output objects', () => {
    const output = { success: true, password: 'secret' }
    const result = sanitizeOutput(output)
    expect(result).toEqual({
      success: true,
      password: '[REDACTED]',
    })
  })

  it('should truncate long strings at 10000 characters', () => {
    const longString = 'a'.repeat(15000)
    const output = { data: longString }
    const result = sanitizeOutput(output)
    expect(result).toEqual({
      data: 'a'.repeat(10000) + '...[truncated]',
    })
  })

  it('should pass through strings under 10000 characters', () => {
    const output = { data: 'short string' }
    const result = sanitizeOutput(output)
    expect(result).toEqual(output)
  })

  it('should truncate long strings at top level', () => {
    const longString = 'x'.repeat(12000)
    const result = sanitizeOutput(longString)
    expect(result).toBe('x'.repeat(10000) + '...[truncated]')
  })

  it('should handle nested objects with both redaction and truncation', () => {
    const output = {
      user: {
        name: 'John',
        token: 'secret_token_value',
        bio: 'a'.repeat(15000),
      },
    }
    const result = sanitizeOutput(output)
    expect(result).toEqual({
      user: {
        name: 'John',
        token: '[REDACTED]',
        bio: 'a'.repeat(10000) + '...[truncated]',
      },
    })
  })

  it('should handle null and undefined', () => {
    expect(sanitizeOutput(null)).toBeNull()
    expect(sanitizeOutput(undefined)).toBeUndefined()
  })

  it('should pass through non-string primitives', () => {
    expect(sanitizeOutput(123)).toBe(123)
    expect(sanitizeOutput(true)).toBe(true)
  })

  it('should handle arrays (converted to objects)', () => {
    const output = [1, 2, 3]
    const result = sanitizeOutput(output)
    // Arrays are treated as objects with numeric string keys in the function
    expect(result).toEqual({
      '0': 1,
      '1': 2,
      '2': 3,
    })
  })

  it('should redact exactly at 10000 character boundary', () => {
    const exactString = 'b'.repeat(10000)
    const output = { data: exactString }
    const result = sanitizeOutput(output)
    expect(result).toEqual({ data: exactString }) // Not truncated, exactly 10000
  })

  it('should truncate at 10001 characters', () => {
    const longString = 'c'.repeat(10001)
    const output = { data: longString }
    const result = sanitizeOutput(output)
    expect(result).toEqual({
      data: 'c'.repeat(10000) + '...[truncated]',
    })
  })

  it('should recursively process nested structures', () => {
    const output = {
      level1: {
        level2: {
          secret: 'should_be_redacted',
          longText: 'x'.repeat(15000),
        },
      },
    }
    const result = sanitizeOutput(output)
    expect(result).toEqual({
      level1: {
        level2: {
          secret: '[REDACTED]',
          longText: 'x'.repeat(10000) + '...[truncated]',
        },
      },
    })
  })
})
