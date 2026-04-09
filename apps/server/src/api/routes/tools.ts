import { Hono } from 'hono'
import { apiKeyMiddleware } from '../middleware'
import { prisma } from '../../db/client'
import { getAllTools, getToolsByProvider } from '../../registry'
import { ConnectionStatus } from '@prisma/client'
import { PROVIDERS } from '../../constants'
import { logger } from '../../logger'

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
    logger.error('Failed to list tools', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

toolRoutes.get('/connected', apiKeyMiddleware, async (c) => {
  try {
    const user = c.get('user')

    const connections = await prisma.toolConnection.findMany({
      where: { userId: user.id, status: ConnectionStatus.CONNECTED },
      select: {
        provider: {
          select: {
            provider: true,
            toolDefinitions: {
              select: {
                toolId: true,
                name: true,
                description: true,
                authType: true,
              },
            },
          },
        },
      },
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
    logger.error('Failed to list connected tools', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

toolRoutes.get('/:provider', async (c) => {
  try {
    const provider = c.req.param('provider')

    if (!PROVIDERS.includes(provider as any)) {
      return c.json({ error: `Unknown provider: ${provider}` }, 404)
    }

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
    logger.error('Failed to list tools by provider', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})