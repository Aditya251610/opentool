import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Must mock config before importing logger
vi.mock('../config', () => ({
  config: {
    nodeEnv: 'development',
  },
}))

import { logger } from '../logger'

describe('logger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('info', () => {
    it('outputs valid JSON with level=info', () => {
      logger.info('hello')
      expect(logSpy).toHaveBeenCalledOnce()
      const parsed = JSON.parse(logSpy.mock.calls[0][0])
      expect(parsed.level).toBe('info')
      expect(parsed.msg).toBe('hello')
      expect(parsed.ts).toBeDefined()
    })

    it('includes metadata', () => {
      logger.info('request', { method: 'GET', path: '/api' })
      const parsed = JSON.parse(logSpy.mock.calls[0][0])
      expect(parsed.method).toBe('GET')
      expect(parsed.path).toBe('/api')
    })
  })

  describe('warn', () => {
    it('outputs valid JSON with level=warn', () => {
      logger.warn('slow query')
      expect(warnSpy).toHaveBeenCalledOnce()
      const parsed = JSON.parse(warnSpy.mock.calls[0][0])
      expect(parsed.level).toBe('warn')
      expect(parsed.msg).toBe('slow query')
    })
  })

  describe('error', () => {
    it('outputs valid JSON with level=error', () => {
      logger.error('boom')
      expect(errorSpy).toHaveBeenCalledOnce()
      const parsed = JSON.parse(errorSpy.mock.calls[0][0])
      expect(parsed.level).toBe('error')
      expect(parsed.msg).toBe('boom')
    })

    it('extracts Error properties', () => {
      const err = new Error('test error')
      logger.error('caught', err)
      const parsed = JSON.parse(errorSpy.mock.calls[0][0])
      expect(parsed.errorMessage).toBe('test error')
      expect(parsed.errorStack).toContain('Error: test error')
    })

    it('stringifies non-Error values', () => {
      logger.error('caught', 'string-error')
      const parsed = JSON.parse(errorSpy.mock.calls[0][0])
      expect(parsed.errorMessage).toBe('string-error')
    })

    it('includes extra metadata alongside error', () => {
      logger.error('caught', new Error('fail'), { userId: '123' })
      const parsed = JSON.parse(errorSpy.mock.calls[0][0])
      expect(parsed.userId).toBe('123')
      expect(parsed.errorMessage).toBe('fail')
    })
  })

  describe('debug', () => {
    it('outputs in non-production environments', () => {
      logger.debug('trace info')
      expect(logSpy).toHaveBeenCalledOnce()
      const parsed = JSON.parse(logSpy.mock.calls[0][0])
      expect(parsed.level).toBe('debug')
    })
  })

  describe('timestamp format', () => {
    it('ts is a valid ISO 8601 string', () => {
      logger.info('check ts')
      const parsed = JSON.parse(logSpy.mock.calls[0][0])
      expect(() => new Date(parsed.ts)).not.toThrow()
      expect(new Date(parsed.ts).toISOString()).toBe(parsed.ts)
    })
  })
})
