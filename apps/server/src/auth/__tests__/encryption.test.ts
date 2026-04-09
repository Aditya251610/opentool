import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, hashApiKey, generateApiKey } from '../encryption'

describe('encrypt/decrypt', () => {
  it('should roundtrip a string', () => {
    const original = 'my-secret-token-12345'
    const encrypted = encrypt(original)
    expect(encrypted).not.toBe(original)
    expect(decrypt(encrypted)).toBe(original)
  })

  it('should produce different ciphertexts for same input (random IV)', () => {
    const input = 'same-input'
    expect(encrypt(input)).not.toBe(encrypt(input))
  })

  it('should fail on tampered ciphertext', () => {
    const encrypted = encrypt('test')
    const parts = encrypted.split(':')
    parts[2] = parts[2].slice(0, -2) + 'xx' // tamper
    expect(() => decrypt(parts.join(':'))).toThrow()
  })

  it('should fail on invalid format', () => {
    expect(() => decrypt('not-valid')).toThrow()
  })
})

describe('hashApiKey', () => {
  it('should produce consistent hashes', () => {
    const key = 'test-key-123'
    expect(hashApiKey(key)).toBe(hashApiKey(key))
  })

  it('should produce different hashes for different keys', () => {
    expect(hashApiKey('key1')).not.toBe(hashApiKey('key2'))
  })
})

describe('generateApiKey', () => {
  it('should generate a valid API key with raw, hash, and prefix', () => {
    const apiKey = generateApiKey()
    expect(apiKey).toHaveProperty('raw')
    expect(apiKey).toHaveProperty('hash')
    expect(apiKey).toHaveProperty('prefix')
  })

  it('should have a prefix starting with ot_', () => {
    const apiKey = generateApiKey()
    expect(apiKey.prefix).toMatch(/^ot_/)
  })

  it('should have a valid hash of the raw key', () => {
    const apiKey = generateApiKey()
    expect(apiKey.hash).toBe(hashApiKey(apiKey.raw))
  })
})
