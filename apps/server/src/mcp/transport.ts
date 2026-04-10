import { randomUUID } from 'node:crypto'
import { createMcpServer } from './server'
import { Context } from 'hono'
import { logger } from '../logger'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

// Session store: maps session IDs to their transport + server
const sessions = new Map<string, {
  transport: WebStandardStreamableHTTPServerTransport
  server: McpServer
}>()

// Clean up stale sessions after 30 minutes of inactivity
const SESSION_TTL_MS = 30 * 60 * 1000
const sessionLastSeen = new Map<string, number>()

setInterval(() => {
  const now = Date.now()
  for (const [sid, lastSeen] of sessionLastSeen) {
    if (now - lastSeen > SESSION_TTL_MS) {
      const session = sessions.get(sid)
      if (session) {
        session.transport.close().catch(() => {})
        sessions.delete(sid)
        sessionLastSeen.delete(sid)
        logger.info('Cleaned up stale MCP session', { sessionId: sid })
      }
    }
  }
}, 60_000)

function extractBearerToken(c: Context): string | null {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts[0] !== 'Bearer' || !parts[1]) return null
  return parts[1]
}

/**
 * Handles MCP Streamable HTTP requests (GET, POST, DELETE).
 * Supports the full MCP Streamable HTTP transport protocol (2025-11-25)
 * with session management, SSE streaming, and JSON responses.
 */
export async function handleMcpStreamable(c: Context): Promise<Response> {
  const apiKey = extractBearerToken(c)
  if (!apiKey) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Missing or invalid Bearer token' },
      id: null,
    }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const sessionId = c.req.header('mcp-session-id')

  try {
    // Existing session — reuse transport
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!
      sessionLastSeen.set(sessionId, Date.now())
      return await session.transport.handleRequest(c.req.raw)
    }

    // New session — only allowed on POST with initialize request
    if (c.req.method === 'POST') {
      const body = await c.req.json()

      if (!sessionId && isInitializeRequest(body)) {
        const mcpServer = await createMcpServer(apiKey)

        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (sid) => {
            sessions.set(sid, { transport, server: mcpServer })
            sessionLastSeen.set(sid, Date.now())
            logger.info('MCP session initialized', { sessionId: sid })
          },
          onsessionclosed: (sid) => {
            sessions.delete(sid)
            sessionLastSeen.delete(sid)
            logger.info('MCP session closed', { sessionId: sid })
          },
        })

        transport.onclose = () => {
          const sid = transport.sessionId
          if (sid) {
            sessions.delete(sid)
            sessionLastSeen.delete(sid)
          }
        }

        await mcpServer.connect(transport)
        return await transport.handleRequest(c.req.raw, { parsedBody: body })
      }

      // POST but not an initialize request and no valid session
      if (sessionId) {
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Session not found. Send an initialize request first.' },
          id: null,
        }), { status: 404, headers: { 'Content-Type': 'application/json' } })
      }

      // POST without session ID and not initialize — use stateless single-shot mode
      return await handleStatelessPost(apiKey, body, c)
    }

    // GET/DELETE without valid session
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'No valid session. POST an initialize request first.' },
      id: null,
    }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    logger.error('MCP transport error', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32603, message },
      id: null,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

/**
 * Stateless single-shot POST handler (backward compat for simple curl/SDK usage).
 * Creates an ephemeral in-memory transport, auto-initializes, sends one request, returns one response.
 */
async function handleStatelessPost(apiKey: string, body: unknown, c: Context): Promise<Response> {
  const mcpServer = await createMcpServer(apiKey)
  const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await mcpServer.connect(serverTransport)

  const jsonBody = body as JSONRPCMessage

  // Auto-initialize if the request isn't an initialize call
  if (!('method' in jsonBody) || (jsonBody as { method: string }).method !== 'initialize') {
    await new Promise<void>((resolve) => {
      const origHandler = clientTransport.onmessage
      clientTransport.onmessage = () => {
        clientTransport.onmessage = origHandler
        clientTransport.send({ jsonrpc: '2.0', method: 'notifications/initialized' })
        resolve()
      }
      clientTransport.send({
        jsonrpc: '2.0',
        id: '_init',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'opentool-http', version: '1.0.0' },
        },
      })
    })
  }

  return new Promise((resolve) => {
    clientTransport.onmessage = (message) => {
      resolve(new Response(JSON.stringify(message), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    clientTransport.send(jsonBody)
  })
}

/** @deprecated Use handleMcpStreamable instead */
export const handleMcpHono = handleMcpStreamable

/** Clean up all sessions (for graceful shutdown) */
export async function closeAllMcpSessions(): Promise<void> {
  for (const [sid, session] of sessions) {
    try {
      await session.transport.close()
    } catch (error) {
      logger.error('Error closing MCP session', { sessionId: sid, error })
    }
  }
  sessions.clear()
  sessionLastSeen.clear()
}