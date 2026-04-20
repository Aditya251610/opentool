/**
 * gRPC-MCP Bridge Transport Service.
 *
 * Bridges MCP JSON-RPC messages over gRPC transport, following Google's proposed
 * gRPC transport spec for MCP. Enables any gRPC-capable MCP client to connect.
 *
 * Two modes:
 * - Connect (bidi stream): Full MCP session with streaming notifications
 * - Send (unary): Single-shot stateless MCP request/response
 */

import { randomUUID } from 'node:crypto'
import * as grpc from '@grpc/grpc-js'
import { createMcpServer } from '../../mcp/server'
import { logger } from '../../logger'
import { getUserId } from '../interceptors/auth'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

// ─── Session Management ────────────────────────────────────────────────────

interface McpGrpcSession {
  id: string
  server: McpServer
  clientTransport: any // InMemoryTransport client end
  apiKey: string
  createdAt: number
  lastSeenAt: number
}

const sessions = new Map<string, McpGrpcSession>()
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes

// Periodic cleanup of stale sessions
let cleanupTimer: NodeJS.Timeout | null = null

function startSessionCleanup(): void {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [sid, session] of sessions) {
      if (now - session.lastSeenAt > SESSION_TTL_MS) {
        sessions.delete(sid)
        logger.info('Cleaned up stale gRPC-MCP session', { sessionId: sid })
      }
    }
  }, 60_000)
  // Don't prevent process from exiting
  if (cleanupTimer.unref) cleanupTimer.unref()
}

function getOrCreateSession(
  sessionId: string | undefined,
  apiKey: string,
): { session: McpGrpcSession; isNew: boolean } {
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!
    session.lastSeenAt = Date.now()
    return { session, isNew: false }
  }
  return {
    session: {
      id: '',
      server: null as any,
      clientTransport: null,
      apiKey,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    },
    isNew: true,
  }
}

// ─── Connect RPC (Bidirectional Streaming) ─────────────────────────────────

/**
 * Bidirectional streaming MCP-over-gRPC transport.
 * Client sends JSON-RPC requests, server streams back JSON-RPC responses.
 * Session is maintained for the duration of the stream.
 */
function connect(call: grpc.ServerDuplexStream<any, any>): void {
  let apiKey: string
  try {
    apiKey = getUserId(call)
  } catch {
    call.emit('error', {
      code: grpc.status.UNAUTHENTICATED,
      message: 'Missing or invalid API key',
    })
    call.end()
    return
  }
  if (!apiKey) {
    call.emit('error', {
      code: grpc.status.UNAUTHENTICATED,
      message: 'Missing or invalid API key',
    })
    call.end()
    return
  }

  let sessionId: string | null = null
  let clientTransport: any = null
  let initialized = false

  startSessionCleanup()

  call.on('data', async (message: any) => {
    try {
      const payload = message.jsonRpcPayload || message.json_rpc_payload
      if (!payload) {
        call.write({
          jsonRpcPayload: JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32600, message: 'Empty JSON-RPC payload' },
            id: null,
          }),
          sessionId: sessionId || '',
          type: 2, // RESPONSE
        })
        return
      }

      const rpcMessage = JSON.parse(payload)
      const requestedSessionId = message.sessionId || message.session_id

      // Handle initialize request — creates new session
      if (rpcMessage.method === 'initialize' && !initialized) {
        try {
          const mcpServer = await createMcpServer(apiKey)
          sessionId = requestedSessionId || randomUUID()

          const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')
          const [client, serverTransport] = InMemoryTransport.createLinkedPair()
          clientTransport = client

          // Forward server responses back to gRPC stream
          clientTransport.onmessage = (msg: any) => {
            try {
              call.write({
                jsonRpcPayload: JSON.stringify(msg),
                sessionId: sessionId!,
                type: 2, // RESPONSE
              })
            } catch {
              // Stream may be closed
            }
          }

          await mcpServer.connect(serverTransport)

          // Store session with transport reference
          sessions.set(sessionId!, {
            id: sessionId!,
            server: mcpServer,
            clientTransport,
            apiKey,
            createdAt: Date.now(),
            lastSeenAt: Date.now(),
          })

          initialized = true

          // Forward the initialize request
          await clientTransport.send(rpcMessage)
          logger.info('gRPC-MCP session initialized', { sessionId })
        } catch (err: any) {
          call.write({
            jsonRpcPayload: JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32603, message: err.message || 'Failed to initialize MCP session' },
              id: rpcMessage.id ?? null,
            }),
            sessionId: '',
            type: 2,
          })
        }
        return
      }

      // For non-initialize requests, session must be established
      if (!initialized || !clientTransport) {
        call.write({
          jsonRpcPayload: JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Session not initialized. Send an initialize request first.',
            },
            id: rpcMessage.id ?? null,
          }),
          sessionId: '',
          type: 2,
        })
        return
      }

      // Update last seen
      const session = sessions.get(sessionId!)
      if (session) session.lastSeenAt = Date.now()

      // Forward the request to the MCP server via the stored transport
      await clientTransport.send(rpcMessage)
    } catch (err: any) {
      logger.error('gRPC-MCP bridge error', { error: err.message })
      call.write({
        jsonRpcPayload: JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: err.message || 'Internal error' },
          id: null,
        }),
        sessionId: sessionId || '',
        type: 2,
      })
    }
  })

  call.on('end', () => {
    if (sessionId) {
      sessions.delete(sessionId)
      logger.info('gRPC-MCP session ended', { sessionId })
    }
    call.end()
  })

  call.on('error', (err: any) => {
    if (sessionId) sessions.delete(sessionId)
    if (err.code !== grpc.status.CANCELLED) {
      logger.error('gRPC-MCP stream error', { error: err.message, sessionId })
    }
  })
}

// ─── Send RPC (Unary — Stateless) ──────────────────────────────────────────

/**
 * Unary MCP-over-gRPC. Single-shot: auto-initializes, sends one request, returns one response.
 * Best for simple tool calls that don't need persistent sessions.
 */
async function send(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>,
): Promise<void> {
  let apiKey: string
  try {
    apiKey = getUserId(call)
  } catch {
    callback({
      code: grpc.status.UNAUTHENTICATED,
      message: 'Missing or invalid API key',
    })
    return
  }
  if (!apiKey) {
    callback({
      code: grpc.status.UNAUTHENTICATED,
      message: 'Missing or invalid API key',
    })
    return
  }

  try {
    const payload = call.request.jsonRpcPayload || call.request.json_rpc_payload
    if (!payload) {
      callback(null, {
        jsonRpcPayload: JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Empty JSON-RPC payload' },
          id: null,
        }),
        sessionId: '',
        type: 2,
      })
      return
    }

    const rpcMessage = JSON.parse(payload)

    // Create ephemeral MCP server + transport
    const mcpServer = await createMcpServer(apiKey)
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await mcpServer.connect(serverTransport)

    // Auto-initialize if not an initialize request
    if (rpcMessage.method !== 'initialize') {
      await new Promise<void>((resolve) => {
        const origHandler = clientTransport.onmessage
        clientTransport.onmessage = () => {
          clientTransport.onmessage = origHandler
          clientTransport.send({ jsonrpc: '2.0', method: 'notifications/initialized' })
          resolve()
        }
        clientTransport.send({
          jsonrpc: '2.0',
          id: '_grpc_init',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'opentool-grpc-bridge', version: '1.0.0' },
          },
        })
      })
    }

    // Send the actual request and capture response
    const response = await new Promise<any>((resolve) => {
      clientTransport.onmessage = (msg: any) => resolve(msg)
      clientTransport.send(rpcMessage)
    })

    callback(null, {
      jsonRpcPayload: JSON.stringify(response),
      sessionId: '',
      type: 2,
    })
  } catch (err: any) {
    logger.error('gRPC-MCP Send error', { error: err.message })

    if (err.message === 'Invalid API key') {
      callback({
        code: grpc.status.UNAUTHENTICATED,
        message: 'Invalid API key',
      })
      return
    }

    callback(null, {
      jsonRpcPayload: JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message: err.message || 'Internal error' },
        id: null,
      }),
      sessionId: '',
      type: 2,
    })
  }
}

// ─── Exports ───────────────────────────────────────────────────────────────

export const mcpBridgeServiceImpl = {
  Connect: connect,
  Send: send,
}

/**
 * Clean up all gRPC-MCP bridge sessions (for graceful shutdown).
 */
export async function closeAllGrpcMcpSessions(): Promise<void> {
  sessions.clear()
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
  logger.info('gRPC-MCP bridge sessions cleaned up')
}

/**
 * Get the number of active gRPC-MCP sessions.
 */
export function getGrpcMcpSessionCount(): number {
  return sessions.size
}
