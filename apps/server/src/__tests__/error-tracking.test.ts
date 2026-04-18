import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock config before importing
vi.mock('../config', () => ({
  config: {
    nodeEnv: 'test',
  },
}))

// Mock logger to suppress output
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('error-tracking', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.SENTRY_DSN
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('captureException logs error when no Sentry DSN', async () => {
    const { logger } = await import('../logger')
    const { captureException } = await import('../error-tracking')

    const err = new Error('test failure')
    captureException(err, { userId: 'u1' })

    expect(logger.error).toHaveBeenCalledWith(
      'Captured exception',
      err,
      expect.objectContaining({ context: { userId: 'u1' } }),
    )
  })

  it('captureException sends to Sentry when DSN is configured', async () => {
    process.env.SENTRY_DSN = 'https://abc123@o123.ingest.sentry.io/456'

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'))

    const { captureException } = await import('../error-tracking')

    const err = new Error('sentry test')
    captureException(err, { provider: 'github', toolId: 'list_repos' })

    // fetch is called fire-and-forget, give it a tick
    await new Promise((r) => setTimeout(r, 10))

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toContain('sentry.io/api/456/store/')
    expect(options?.method).toBe('POST')

    const body = JSON.parse(options?.body as string)
    expect(body.exception.values[0].type).toBe('Error')
    expect(body.exception.values[0].value).toBe('sentry test')
    expect(body.tags.provider).toBe('github')
    expect(body.platform).toBe('node')
  })

  it('captureException handles fetch failure silently', async () => {
    process.env.SENTRY_DSN = 'https://key@o1.ingest.sentry.io/99'

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))

    const { captureException } = await import('../error-tracking')
    // Should not throw
    expect(() => captureException(new Error('boom'))).not.toThrow()
  })

  it('addBreadcrumb calls logger.debug', async () => {
    const { logger } = await import('../logger')
    const { addBreadcrumb } = await import('../error-tracking')

    addBreadcrumb('user clicked', { page: '/dashboard' })
    expect(logger.debug).toHaveBeenCalledWith('user clicked', { page: '/dashboard' })
  })

  it('warns on invalid SENTRY_DSN', async () => {
    process.env.SENTRY_DSN = 'not-a-url'
    const { logger } = await import('../logger')
    await import('../error-tracking')
    expect(logger.warn).toHaveBeenCalledWith('Invalid SENTRY_DSN, error tracking disabled')
  })
})
