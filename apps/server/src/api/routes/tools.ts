import { Hono } from 'hono'
import { apiKeyMiddleware } from '../middleware'
import { prisma } from '../../db/client'
import { getAllTools, getToolsByProvider } from '../../registry'
import { ConnectionStatus } from '@prisma/client'

export const toolRoutes = new Hono()

toolRoutes.get('/', async (c) => {
  try {
    const tools = getAllTools()
    return c.json({
      count: tools.length,
      tools: tools.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        provider: t.provider,
        authType: t.authType,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

toolRoutes.get('/connected', apiKeyMiddleware, async (c) => {
  try {
    const user = c.get('user')

    const connections = await prisma.toolConnection.findMany({
      where: { userId: user.id, status: ConnectionStatus.CONNECTED },
      include: { provider: { include: { toolDefinitions: true } } },
    })

    const tools = connections.flatMap(conn =>
      conn.provider.toolDefinitions.map(t => ({
        id: t.toolId,
        name: t.name,
        description: t.description,
        provider: conn.provider.provider,
        authType: t.authType,
      }))
    )

    return c.json({ count: tools.length, tools })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

toolRoutes.get('/:provider', async (c) => {
  try {
    const provider = c.req.param('provider')
    const tools = getToolsByProvider(provider)

    if (tools.length === 0) {
      return c.json({ error: 'Provider not found' }, 404)
    }

    return c.json({
      count: tools.length,
      tools: tools.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        provider: t.provider,
        authType: t.authType,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})