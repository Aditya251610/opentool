import { describe, it, expect, vi } from 'vitest'

// Mock the auth broker
vi.mock('../../auth/broker', () => ({
  resolveApiKey: vi.fn(),
}))

// Mock the database client
vi.mock('../../db/client', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]),
    toolConnection: { findMany: vi.fn().mockResolvedValue([]) },
    toolDefinition: { findUnique: vi.fn().mockResolvedValue(null) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}))

// Mock ioredis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      ping: vi.fn().mockResolvedValue('PONG'),
      disconnect: vi.fn(),
    })),
  }
})

// Mock config
vi.mock('../../config', () => ({
  config: {
    redisUrl: 'redis://localhost:6379',
    dashboardUrl: 'http://localhost:3000',
    nodeEnv: 'test',
  },
}))

// Mock error tracking
vi.mock('../../error-tracking', () => ({
  captureException: vi.fn(),
}))

describe('gRPC Server Module', () => {
  describe('server.ts', () => {
    it('should export startGrpcServer and shutdownGrpcServer', async () => {
      const serverModule = await import('../server')
      expect(serverModule.startGrpcServer).toBeDefined()
      expect(typeof serverModule.startGrpcServer).toBe('function')
      expect(serverModule.shutdownGrpcServer).toBeDefined()
      expect(typeof serverModule.shutdownGrpcServer).toBe('function')
    })

    it('should export isGrpcServerRunning', async () => {
      const serverModule = await import('../server')
      expect(serverModule.isGrpcServerRunning).toBeDefined()
      expect(serverModule.isGrpcServerRunning()).toBe(false)
    })
  })

  describe('interceptors/auth.ts', () => {
    it('should export getUserId', async () => {
      const authModule = await import('../interceptors/auth')
      expect(authModule.getUserId).toBeDefined()
      expect(typeof authModule.getUserId).toBe('function')
    })

    it('getUserId should throw if no user context', async () => {
      const { getUserId } = await import('../interceptors/auth')
      const mockCall = {
        metadata: {
          get: vi.fn().mockReturnValue([]),
        },
      }
      expect(() => getUserId(mockCall as any)).toThrow('User ID not found')
    })

    it('getUserId should extract userId from metadata', async () => {
      const { getUserId } = await import('../interceptors/auth')
      const mockCall = {
        metadata: {
          get: vi.fn().mockReturnValue(['user-123']),
        },
      }
      expect(getUserId(mockCall as any)).toBe('user-123')
    })

    it('getUserId should prefer userId property over metadata', async () => {
      const { getUserId } = await import('../interceptors/auth')
      const mockCall = {
        userId: 'user-direct',
        metadata: {
          get: vi.fn().mockReturnValue(['user-metadata']),
        },
      }
      expect(getUserId(mockCall as any)).toBe('user-direct')
    })
  })

  describe('services/health-service.ts', () => {
    it('should export healthServiceImpl', async () => {
      const healthModule = await import('../services/health-service')
      expect(healthModule.healthServiceImpl).toBeDefined()
      expect(healthModule.healthServiceImpl.Check).toBeDefined()
      expect(healthModule.healthServiceImpl.Watch).toBeDefined()
    })

    it('Check should return SERVING when DB and Redis are healthy', async () => {
      const { healthServiceImpl } = await import('../services/health-service')

      const callback = vi.fn()
      const mockCall = { request: { service: '' } }

      await (healthServiceImpl.Check as any)(mockCall, callback)

      expect(callback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          status: 'SERVING_STATUS_SERVING',
          detail: expect.objectContaining({
            databaseOk: true,
            redisOk: true,
          }),
        }),
      )
    })
  })

  describe('services/tool-service.ts', () => {
    it('should export toolServiceImpl with all RPCs', async () => {
      const toolModule = await import('../services/tool-service')
      expect(toolModule.toolServiceImpl).toBeDefined()
      expect(toolModule.toolServiceImpl.ListTools).toBeDefined()
      expect(toolModule.toolServiceImpl.ExecuteTool).toBeDefined()
      expect(toolModule.toolServiceImpl.ExecuteToolStream).toBeDefined()
      expect(toolModule.toolServiceImpl.BatchExecute).toBeDefined()
      expect(toolModule.toolServiceImpl.GetToolSchema).toBeDefined()
    })

    it('ExecuteTool should return error for missing tool_id', async () => {
      const { toolServiceImpl } = await import('../services/tool-service')

      const callback = vi.fn()
      const mockCall = {
        request: { toolId: '', inputJson: '{}' },
        userId: 'user-123',
        metadata: { get: vi.fn().mockReturnValue(['user-123']) },
      }

      await (toolServiceImpl.ExecuteTool as any)(mockCall, callback)

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.any(Number),
          message: 'tool_id is required',
        }),
      )
    })

    it('GetToolSchema should return NOT_FOUND for unknown tool', async () => {
      const { toolServiceImpl } = await import('../services/tool-service')

      const callback = vi.fn()
      const mockCall = {
        request: { toolId: 'nonexistent.tool' },
        metadata: { get: vi.fn().mockReturnValue([]) },
      }

      await (toolServiceImpl.GetToolSchema as any)(mockCall, callback)

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Tool not found'),
        }),
      )
    })
  })
})

describe('Proto definitions', () => {
  it('should load @opentool/proto without errors', async () => {
    const proto = await import('@opentool/proto')
    expect(proto.getToolServiceDefinition).toBeDefined()
    expect(proto.getHealthServiceDefinition).toBeDefined()
    expect(proto.getMcpTransportDefinition).toBeDefined()
    expect(proto.ToolServiceClient).toBeDefined()
    expect(proto.HealthClient).toBeDefined()
    expect(proto.McpTransportClient).toBeDefined()
  })

  it('should return valid service definitions', async () => {
    const proto = await import('@opentool/proto')
    const toolDef = proto.getToolServiceDefinition()
    expect(toolDef).toBeDefined()
    expect(typeof toolDef).toBe('object')

    const healthDef = proto.getHealthServiceDefinition()
    expect(healthDef).toBeDefined()
    expect(typeof healthDef).toBe('object')

    const mcpDef = proto.getMcpTransportDefinition()
    expect(mcpDef).toBeDefined()
    expect(typeof mcpDef).toBe('object')
  })
})

describe('gRPC-MCP Bridge Service', () => {
  it('should export mcpBridgeServiceImpl with Connect and Send RPCs', async () => {
    const bridgeModule = await import('../services/mcp-bridge-service')
    expect(bridgeModule.mcpBridgeServiceImpl).toBeDefined()
    expect(bridgeModule.mcpBridgeServiceImpl.Connect).toBeDefined()
    expect(bridgeModule.mcpBridgeServiceImpl.Send).toBeDefined()
    expect(typeof bridgeModule.mcpBridgeServiceImpl.Connect).toBe('function')
    expect(typeof bridgeModule.mcpBridgeServiceImpl.Send).toBe('function')
  })

  it('should export session management functions', async () => {
    const bridgeModule = await import('../services/mcp-bridge-service')
    expect(bridgeModule.closeAllGrpcMcpSessions).toBeDefined()
    expect(bridgeModule.getGrpcMcpSessionCount).toBeDefined()
    expect(typeof bridgeModule.closeAllGrpcMcpSessions).toBe('function')
    expect(typeof bridgeModule.getGrpcMcpSessionCount).toBe('function')
  })

  it('getGrpcMcpSessionCount should return 0 initially', async () => {
    const bridgeModule = await import('../services/mcp-bridge-service')
    expect(bridgeModule.getGrpcMcpSessionCount()).toBe(0)
  })

  it('closeAllGrpcMcpSessions should be safe to call when empty', async () => {
    const bridgeModule = await import('../services/mcp-bridge-service')
    await expect(bridgeModule.closeAllGrpcMcpSessions()).resolves.toBeUndefined()
  })

  it('Send should reject unauthenticated calls', async () => {
    const bridgeModule = await import('../services/mcp-bridge-service')

    const callback = vi.fn()
    const mockCall = {
      request: {
        jsonRpcPayload: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
        sessionId: '',
        type: 1,
      },
      metadata: { get: vi.fn().mockReturnValue([]) },
    }

    await (bridgeModule.mcpBridgeServiceImpl.Send as any)(mockCall, callback)

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        code: expect.any(Number),
        message: expect.stringContaining('API key'),
      }),
    )
  })
})
