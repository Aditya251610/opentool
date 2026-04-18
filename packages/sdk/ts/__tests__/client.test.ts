import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenTool } from '../src/client'
import { HttpClient } from '../src/http'
import { OpenToolError, AuthenticationError, NotFoundError } from '../src/types'

// ─── Error classes ──────────────────────────────────────────────────────────

describe('Error classes', () => {
  it('OpenToolError stores status and body', () => {
    const err = new OpenToolError('fail', 500, { detail: 'crash' })
    expect(err.message).toBe('fail')
    expect(err.status).toBe(500)
    expect(err.body).toEqual({ detail: 'crash' })
    expect(err.name).toBe('OpenToolError')
    expect(err).toBeInstanceOf(Error)
  })

  it('AuthenticationError defaults to 401', () => {
    const err = new AuthenticationError()
    expect(err.status).toBe(401)
    expect(err.name).toBe('AuthenticationError')
    expect(err).toBeInstanceOf(OpenToolError)
  })

  it('AuthenticationError accepts custom message', () => {
    const err = new AuthenticationError('Token expired')
    expect(err.message).toBe('Token expired')
    expect(err.status).toBe(401)
  })

  it('NotFoundError is 404', () => {
    const err = new NotFoundError('Tool not found')
    expect(err.status).toBe(404)
    expect(err.name).toBe('NotFoundError')
    expect(err).toBeInstanceOf(OpenToolError)
  })
})

// ─── HttpClient ─────────────────────────────────────────────────────────────

function mockFetch(response: {
  ok: boolean
  status: number
  body?: unknown
  headers?: Record<string, string>
}) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    text: () => Promise.resolve(response.body ? JSON.stringify(response.body) : ''),
    headers: new Map(Object.entries(response.headers ?? {})),
  })
}

describe('HttpClient', () => {
  it('makes GET request with correct URL', async () => {
    const fetch = mockFetch({ ok: true, status: 200, body: { data: 'ok' } })
    const client = new HttpClient({ baseUrl: 'http://localhost:3001', fetch })

    const result = await client.get('/health')
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:3001/health')
    expect(result).toEqual({ data: 'ok' })
  })

  it('strips trailing slashes from baseUrl', async () => {
    const fetch = mockFetch({ ok: true, status: 200, body: {} })
    const client = new HttpClient({ baseUrl: 'http://localhost:3001///', fetch })

    await client.get('/test')
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:3001/test')
  })

  it('includes Authorization header when apiKey is set', async () => {
    const fetch = mockFetch({ ok: true, status: 200, body: {} })
    const client = new HttpClient({ baseUrl: 'http://localhost:3001', apiKey: 'ot_test123', fetch })

    await client.get('/api/tools')
    const headers = fetch.mock.calls[0][1].headers
    expect(headers['Authorization']).toBe('Bearer ot_test123')
  })

  it('omits Authorization header when no apiKey', async () => {
    const fetch = mockFetch({ ok: true, status: 200, body: {} })
    const client = new HttpClient({ baseUrl: 'http://localhost:3001', fetch })

    await client.get('/api/tools')
    const headers = fetch.mock.calls[0][1].headers
    expect(headers['Authorization']).toBeUndefined()
  })

  it('sends JSON body for POST', async () => {
    const fetch = mockFetch({ ok: true, status: 200, body: { created: true } })
    const client = new HttpClient({ baseUrl: 'http://localhost:3001', fetch })

    await client.post('/api/keys', { name: 'test-key' })
    expect(fetch.mock.calls[0][1].method).toBe('POST')
    expect(fetch.mock.calls[0][1].body).toBe(JSON.stringify({ name: 'test-key' }))
  })

  it('throws AuthenticationError on 401', async () => {
    const fetch = mockFetch({ ok: false, status: 401, body: { error: 'Unauthorized' } })
    const client = new HttpClient({ baseUrl: 'http://localhost:3001', fetch, maxRetries: 0 })

    await expect(client.get('/api/me')).rejects.toThrow(AuthenticationError)
  })

  it('throws OpenToolError on non-retryable failure', async () => {
    const fetch = mockFetch({ ok: false, status: 422, body: { error: 'Validation failed' } })
    const client = new HttpClient({ baseUrl: 'http://localhost:3001', fetch, maxRetries: 0 })

    await expect(client.get('/api/tools')).rejects.toThrow(OpenToolError)
  })

  it('retries on 500', async () => {
    let callCount = 0
    const fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve(''),
          headers: new Map(),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ ok: true })),
        headers: new Map(),
      })
    })

    const client = new HttpClient({
      baseUrl: 'http://localhost:3001',
      fetch,
      maxRetries: 2,
      timeout: 5000,
    })

    const result = await client.get('/health')
    expect(callCount).toBe(2)
    expect(result).toEqual({ ok: true })
  })

  it('setApiKey and clearApiKey work', async () => {
    const fetch = mockFetch({ ok: true, status: 200, body: {} })
    const client = new HttpClient({ baseUrl: 'http://localhost:3001', fetch })

    client.setApiKey('ot_new')
    await client.get('/test')
    expect(fetch.mock.calls[0][1].headers['Authorization']).toBe('Bearer ot_new')

    fetch.mockClear()
    client.clearApiKey()
    await client.get('/test')
    expect(fetch.mock.calls[0][1].headers['Authorization']).toBeUndefined()
  })

  it('PATCH and DELETE use correct methods', async () => {
    const fetch = mockFetch({ ok: true, status: 200, body: {} })
    const client = new HttpClient({ baseUrl: 'http://localhost:3001', fetch })

    await client.patch('/api/users/me', { name: 'New' })
    expect(fetch.mock.calls[0][1].method).toBe('PATCH')

    await client.delete('/api/keys/123')
    expect(fetch.mock.calls[1][1].method).toBe('DELETE')
  })
})

// ─── OpenTool Client ────────────────────────────────────────────────────────

describe('OpenTool client', () => {
  it('constructs with baseUrl', () => {
    const client = new OpenTool({
      baseUrl: 'http://localhost:3001',
      fetch: mockFetch({ ok: true, status: 200, body: {} }),
    })
    expect(client.auth).toBeDefined()
    expect(client.users).toBeDefined()
    expect(client.keys).toBeDefined()
    expect(client.tools).toBeDefined()
  })

  it('health() calls /health', async () => {
    const fetch = mockFetch({
      ok: true,
      status: 200,
      body: { status: 'ok', timestamp: '2025-01-01T00:00:00Z' },
    })
    const client = new OpenTool({ baseUrl: 'http://localhost:3001', fetch })

    const health = await client.health()
    expect(health.status).toBe('ok')
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:3001/health')
  })

  it('setApiKey/clearApiKey proxy to http client', () => {
    const client = new OpenTool({
      baseUrl: 'http://localhost:3001',
      fetch: mockFetch({ ok: true, status: 200, body: {} }),
    })
    // Should not throw
    client.setApiKey('ot_test')
    client.clearApiKey()
  })
})

// ─── Type exports ───────────────────────────────────────────────────────────

describe('SDK type exports', () => {
  it('exports all expected classes', async () => {
    const mod = await import('../src/index')
    expect(mod.OpenTool).toBeDefined()
    expect(mod.OpenToolError).toBeDefined()
    expect(mod.AuthenticationError).toBeDefined()
    expect(mod.NotFoundError).toBeDefined()
  })
})
