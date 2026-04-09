import crypto from 'crypto'
import { config } from '../config'
import { AES_ALGORITHM, IV_LENGTH, TAG_LENGTH, API_KEY_PREFIX } from '../constants'

function getKey(): Buffer {
  return Buffer.from(config.encryptionKey, 'hex')
}

/** Encrypts a plaintext string using AES-256-GCM. Returns `iv:authTag:ciphertext` in hex. */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv)
  const encrypted = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

/** Decrypts an `iv:authTag:ciphertext` hex string produced by {@link encrypt}. */
export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, ciphertext] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const key = getKey()
  const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = decipher.update(ciphertext, 'hex', 'utf8') + decipher.final('utf8')
  return decrypted
}

/** Returns a SHA-256 hex hash of a raw API key for storage/lookup. */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

/** Generates a new API key with a raw value, its SHA-256 hash, and a display prefix. */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = crypto.randomBytes(32).toString('hex')
  const prefix = `${API_KEY_PREFIX}${raw.slice(0, 8)}`
  const hash = hashApiKey(raw)
  return { raw, hash, prefix }
}