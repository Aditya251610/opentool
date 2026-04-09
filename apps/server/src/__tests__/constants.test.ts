import { describe, it, expect } from 'vitest'
import { PROVIDERS, BCRYPT_ROUNDS, PASSWORD_MIN_LENGTH, AES_ALGORITHM, IV_LENGTH, TAG_LENGTH } from '../constants'

describe('constants', () => {
  it('PROVIDERS is a non-empty array of strings', () => {
    expect(PROVIDERS.length).toBeGreaterThan(0)
    PROVIDERS.forEach((p) => expect(typeof p).toBe('string'))
  })

  it('PROVIDERS includes common providers', () => {
    expect(PROVIDERS).toContain('github')
    expect(PROVIDERS).toContain('notion')
    expect(PROVIDERS).toContain('slack')
  })

  it('BCRYPT_ROUNDS is reasonable', () => {
    expect(BCRYPT_ROUNDS).toBeGreaterThanOrEqual(10)
    expect(BCRYPT_ROUNDS).toBeLessThanOrEqual(15)
  })

  it('PASSWORD_MIN_LENGTH is at least 8', () => {
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(8)
  })

  it('AES_ALGORITHM is correct', () => {
    expect(AES_ALGORITHM).toBe('aes-256-gcm')
  })

  it('IV_LENGTH is correct for GCM', () => {
    expect(IV_LENGTH).toBe(12)
  })

  it('TAG_LENGTH is correct for GCM', () => {
    expect(TAG_LENGTH).toBe(16)
  })
})
