import { describe, it, expect, vi, beforeEach } from 'vitest'
import { safeToolError, safeFetch, fetchWithRetry } from '../utils'

// Mock logger
vi.mock('../../src/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('safeToolError', () => {
  it('should wrap Error with safe message', () => {
    const err = new Error('Internal API failure details')
    const result = safeToolError(err, 'github', 'create_issue')
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toContain('github')
    expect(result.message).toContain('create_issue')
    expect(result.message).not.toContain('Internal API failure details')
  })

  it('should handle non-Error values', () => {
    const result = safeToolError('string error', 'slack', 'send_message')
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toContain('slack')
  })

  it('should handle null/undefined', () => {
    const result = safeToolError(null, 'notion', 'create_page')
    expect(result).toBeInstanceOf(Error)
  })
})

describe('safeFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should return response on success', async () => {
    const mockRes = new Response(JSON.stringify({ ok: true }), { status: 200 })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockRes)

    const res = await safeFetch('https://api.example.com', {}, 'test', 'action')
    expect(res.status).toBe(200)
  })

  it('should throw on non-ok response', async () => {
    const mockRes = new Response('Forbidden', { status: 403 })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockRes)

    await expect(safeFetch('https://api.example.com', {}, 'test', 'action')).rejects.toThrow(
      /test action failed/,
    )
  })

  it('should include status code in error', async () => {
    const mockRes = new Response('Not Found', { status: 404 })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockRes)

    await expect(safeFetch('https://api.example.com', {}, 'github', 'get_repo')).rejects.toThrow(
      /HTTP 404/,
    )
  })
})

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should return on first success', async () => {
    const mockRes = new Response(JSON.stringify({ data: 'ok' }), { status: 200 })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockRes)

    const res = await fetchWithRetry('https://api.example.com', {}, 'test', 'action', {
      maxRetries: 2,
      baseDelayMs: 10,
    })
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('should retry on 429 status', async () => {
    const retryRes = new Response('', { status: 429 })
    const okRes = new Response('{"ok":true}', { status: 200 })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(retryRes).mockResolvedValueOnce(okRes)

    const res = await fetchWithRetry('https://api.example.com', {}, 'test', 'action', {
      maxRetries: 2,
      baseDelayMs: 10,
    })
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('should retry on 500 status', async () => {
    const retryRes = new Response('', { status: 500 })
    const okRes = new Response('{"ok":true}', { status: 200 })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(retryRes).mockResolvedValueOnce(okRes)

    const res = await fetchWithRetry('https://api.example.com', {}, 'test', 'action', {
      maxRetries: 2,
      baseDelayMs: 10,
    })
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('should throw on non-retryable error (403)', async () => {
    const mockRes = new Response('Forbidden', { status: 403 })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockRes)

    await expect(
      fetchWithRetry('https://api.example.com', {}, 'test', 'action', {
        maxRetries: 2,
        baseDelayMs: 10,
      }),
    ).rejects.toThrow(/failed/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('should exhaust retries and throw', async () => {
    const retryRes = new Response('', { status: 500 })
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(retryRes)
      .mockResolvedValueOnce(retryRes)
      .mockResolvedValueOnce(retryRes)

    await expect(
      fetchWithRetry('https://api.example.com', {}, 'test', 'action', {
        maxRetries: 2,
        baseDelayMs: 10,
      }),
    ).rejects.toThrow(/failed/)
  })

  it('should respect Retry-After header', async () => {
    const headers = new Headers({ 'retry-after': '1' })
    const retryRes = new Response('', { status: 429, headers })
    const okRes = new Response('{"ok":true}', { status: 200 })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(retryRes).mockResolvedValueOnce(okRes)

    const start = Date.now()
    await fetchWithRetry('https://api.example.com', {}, 'test', 'action', {
      maxRetries: 2,
      baseDelayMs: 10,
    })
    const elapsed = Date.now() - start
    // Should have waited ~1000ms for Retry-After
    expect(elapsed).toBeGreaterThanOrEqual(900)
  })
})
