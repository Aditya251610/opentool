import { createMcpServer } from './server'
import { Context } from 'hono'

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

    // Use in-memory transport instead of HTTP transport
    // This handles the JSON-RPC directly without needing Node IncomingMessage
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await mcpServer.connect(serverTransport)

    const body = await c.req.json()

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
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 401)
  }
}