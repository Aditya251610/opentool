import { createMcpServer } from './server'
import { Context } from 'hono'
import { logger } from '../logger'

export async function handleMcpHono(c: Context): Promise<Response> {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) {
    return c.json({ error: 'Missing API key' }, 401)
  }

  const parts = authHeader.split(' ')
  if (parts[0] !== 'Bearer' || !parts[1]) {
    return c.json({ error: 'Invalid API key format' }, 401)
  }

  try {
    const mcpServer = await createMcpServer(parts[1])

    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await mcpServer.connect(serverTransport)

    const body = await c.req.json()

    // Auto-initialize if the request isn't an initialize call
    if (body.method !== 'initialize') {
      await new Promise<void>((resolve) => {
        const origHandler = clientTransport.onmessage
        clientTransport.onmessage = () => {
          clientTransport.onmessage = origHandler
          // Send initialized notification
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
      clientTransport.send(body)
    })
  } catch (error) {
    logger.error('MCP transport error', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 401)
  }
}