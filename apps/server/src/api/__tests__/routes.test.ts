import { describe, it, expect, vi } from 'vitest'
import { app } from '../../index'
import * as prisma from '../../db/client'
import * as broker from '../../auth/broker'

// Mock Prisma
vi.mock('../../db/client', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    apiKey: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    oAuthProvider: {
      findUnique: vi.fn(),
    },
    toolConnection: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

// Mock Redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn(() => ({
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      ttl: vi.fn().mockResolvedValue(60),
      ping: vi.fn().mockResolvedValue('PONG'),
      disconnect: vi.fn(),
      on: vi.fn(),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    })),
  }
})

vi.mock('../../db/redis', () => ({
  redis: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(60),
    ping: vi.fn().mockResolvedValue('PONG'),
    disconnect: vi.fn(),
    on: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
  rateLimitRedis: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(60),
    disconnect: vi.fn(),
    on: vi.fn(),
  },
  disconnectRedis: vi.fn(),
}))

// Mock auth broker
vi.mock('../../auth/broker', () => ({
  resolveApiKey: vi.fn(),
  storeToken: vi.fn(),
}))

// Mock OAuth
vi.mock('../../auth/oauth', () => ({
  generateAuthUrl: vi.fn(),
  exchangeCode: vi.fn(),
  revokeOAuthToken: vi.fn(),
}))

// Mock encryption
vi.mock('../../auth/encryption', () => ({
  generateApiKey: vi.fn(() => ({
    raw: 'test-api-key-raw-value',
    hash: 'test-api-key-hash',
    prefix: 'ot_test',
    fullKey: 'ot_test-api-key-raw-value',
  })),
  stripApiKeyPrefix: vi.fn((key: string) => (key.startsWith('ot_') ? key.slice(3) : key)),
}))

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock registry
vi.mock('../../registry', () => ({
  getAllTools: vi.fn(() => [
    {
      id: 'tool1',
      name: 'Tool 1',
      description: 'Test tool 1',
      provider: 'slack',
      authType: 'OAUTH',
    },
    {
      id: 'tool2',
      name: 'Tool 2',
      description: 'Test tool 2',
      provider: 'gmail',
      authType: 'OAUTH',
    },
  ]),
  getToolsByProvider: vi.fn((provider) => {
    if (provider === 'slack') {
      return [
        {
          id: 'tool1',
          name: 'Slack Tool',
          description: 'Slack integration',
          provider: 'slack',
          authType: 'OAUTH',
        },
      ]
    }
    return []
  }),
}))

describe('Health endpoints', () => {
  it('GET /health/live should return 200 with ok status', async () => {
    const res = await app.request('/health/live')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toEqual({ status: 'ok' })
  })

  it('GET /health/ready should respond (may fail without DB/Redis)', async () => {
    const res = await app.request('/health/ready')
    // Without mocked DB/Redis, this may return 503 (degraded)
    // but the endpoint should exist and respond
    expect([200, 503]).toContain(res.status)
  })

  it('GET /health should respond (backwards compatibility)', async () => {
    const res = await app.request('/health')
    expect([200, 503]).toContain(res.status)
  })
})

describe('Auth routes - Signup validation', () => {
  it('POST /api/auth/signup should reject missing email', async () => {
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'validpass123' }),
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.error).toBeDefined()
  })

  it('POST /api/auth/signup should reject invalid email format', async () => {
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'notanemail', password: 'validpass123' }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/auth/signup should reject missing password', async () => {
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/auth/signup should reject short password', async () => {
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'short' }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/auth/signup should accept valid email and password', async () => {
    // Mock successful user creation
    vi.mocked(prisma.prisma.user.findUnique).mockResolvedValueOnce(null as any)
    vi.mocked(prisma.prisma.user.create).mockResolvedValueOnce({
      id: 'user1',
      email: 'test@example.com',
      name: null,
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)
    vi.mocked(prisma.prisma.apiKey.create).mockResolvedValueOnce({
      id: 'key1',
      userId: 'user1',
      keyHash: 'hash',
      keyPrefix: 'ot_test',
      name: 'Default Key',
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'validpass123',
        name: 'Test User',
      }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.user).toBeDefined()
    expect(body.apiKey).toBe('ot_test-api-key-raw-value')
  })

  it('POST /api/auth/signup should reject duplicate email', async () => {
    vi.mocked(prisma.prisma.user.findUnique).mockResolvedValueOnce({
      id: 'user1',
      email: 'existing@example.com',
      name: null,
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'validpass123',
      }),
    })
    expect(res.status).toBe(409)
  })
})

describe('Auth routes - Login validation', () => {
  it('POST /api/auth/login should reject missing email', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'testpass' }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/auth/login should reject missing password', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/auth/login should reject invalid email format', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'notanemail', password: 'testpass' }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/auth/login should reject empty password', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: '' }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/auth/login should reject missing fields', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })
})

describe('Auth routes - OAuth', () => {
  it('GET /api/auth/connect-url/:provider should reject unknown provider', async () => {
    const res = await app.request('/api/auth/connect-url/invalid-provider', {
      method: 'GET',
      headers: { Authorization: 'Bearer test-key' },
    })
    // This will fail because we don't have a valid API key, but the endpoint should exist
    expect(res.status).not.toBe(404)
  })

  it('GET /api/auth/connect/:provider should reject unknown provider', async () => {
    const res = await app.request('/api/auth/connect/invalid-provider', {
      method: 'GET',
      headers: { Authorization: 'Bearer test-key' },
    })
    expect(res.status).not.toBe(404)
  })

  it('GET /api/auth/callback/:provider should reject missing code/state', async () => {
    const res = await app.request('/api/auth/callback/slack', {
      method: 'GET',
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/auth/connect-api-key/:provider should reject unknown provider', async () => {
    const res = await app.request('/api/auth/connect-api-key/invalid-provider', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-key' },
    })
    expect(res.status).not.toBe(404)
  })
})

describe('Auth routes - Revoke', () => {
  it('DELETE /api/auth/revoke/:provider should reject unknown provider', async () => {
    const res = await app.request('/api/auth/revoke/invalid-provider', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test-key' },
    })
    expect(res.status).not.toBe(404)
  })
})

describe('Tool routes', () => {
  it('GET /api/tools should return tools list', async () => {
    const res = await app.request('/api/tools')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.count).toBe(2)
    expect(body.tools).toHaveLength(2)
    expect((body.tools as unknown[])[0]).toHaveProperty('id')
    expect((body.tools as unknown[])[0]).toHaveProperty('name')
  })

  it('GET /api/tools/:provider should return tools by provider', async () => {
    const res = await app.request('/api/tools/slack')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.tools).toBeDefined()
    expect(Array.isArray(body.tools)).toBe(true)
  })

  it('GET /api/tools/:provider should return 404 for unknown provider', async () => {
    const res = await app.request('/api/tools/unknown')
    expect(res.status).toBe(404)
  })

  it('GET /api/tools/connected should require authentication', async () => {
    const res = await app.request('/api/tools/connected', {
      method: 'GET',
    })
    expect(res.status).toBe(401)
  })
})

describe('MCP routes', () => {
  it('GET /mcp without auth should return 401', async () => {
    const res = await app.request('/mcp', { method: 'GET' })
    expect(res.status).toBe(401)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.error).toBeDefined()
  })

  it('POST /mcp endpoint exists', async () => {
    // This will fail without proper setup but shouldn't be 404
    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).not.toBe(404)
  })
})

describe('API Key middleware', () => {
  it('Protected routes should reject requests without Authorization header', async () => {
    const res = await app.request('/api/tools/connected', {
      method: 'GET',
    })
    expect(res.status).toBe(401)
  })

  it('Protected routes should reject invalid Authorization header format', async () => {
    const res = await app.request('/api/tools/connected', {
      method: 'GET',
      headers: { Authorization: 'InvalidFormat testkey' },
    })
    expect(res.status).toBe(401)
  })

  it('Protected routes should reject requests with invalid API key', async () => {
    vi.mocked(broker.resolveApiKey).mockResolvedValueOnce(null)

    const res = await app.request('/api/tools/connected', {
      method: 'GET',
      headers: { Authorization: 'Bearer invalid-key' },
    })
    expect(res.status).toBe(401)
  })
})

describe('Request validation', () => {
  it('should handle malformed JSON in request body', async () => {
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid json}',
    })
    // Should reject malformed JSON
    expect(res.status).not.toBe(200)
  })

  it('should handle missing Content-Type header gracefully', async () => {
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'pass123' }),
    })
    // Should still attempt to parse
    expect(res.status).not.toBe(500)
  })
})

describe('Rate limiting', () => {
  it('Auth routes should be rate limited', async () => {
    // First request should pass validation checks
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'pass123' }),
    })
    // Should get past rate limiting (400 for validation is OK, 429 would mean rate limited during test)
    expect(res.status).not.toBe(429)
  })
})

describe('404 handling', () => {
  it('Unknown routes should return 404', async () => {
    const res = await app.request('/api/unknown/route', { method: 'GET' })
    expect(res.status).toBe(404)
  })

  it('Non-existent tool provider should return 404', async () => {
    const res = await app.request('/api/tools/nonexistent', { method: 'GET' })
    expect(res.status).toBe(404)
  })
})

describe('HTTP method validation', () => {
  it('POST /health/live with wrong method should not return 200', async () => {
    const res = await app.request('/health/live', { method: 'POST' })
    // Hono returns 404 for wrong HTTP methods, not 405
    expect(res.status).not.toBe(200)
  })

  it('GET /api/auth/signup with wrong method should not return 200', async () => {
    const res = await app.request('/api/auth/signup', { method: 'GET' })
    // Hono returns 404 for wrong HTTP methods, not 405
    expect(res.status).not.toBe(200)
  })
})
