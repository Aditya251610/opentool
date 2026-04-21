import { Hono } from 'hono'
import { apiKeyMiddleware } from '../middleware'
import { prisma } from '../../db/client'
import { getToolsByProvider, getUserTools, getToolCategories } from '../../registry'
import { ConnectionStatus } from '@prisma/client'
import {
  PROVIDERS,
  TOOL_QUERY_DEFAULT_LIMIT,
  TOOL_QUERY_MAX_LIMIT,
  TOOL_QUERY_MAX_QUERY_LENGTH,
} from '../../constants'
import { logger } from '../../logger'
import type { ToolCategory, AuthType } from '@opentool/tool-schema'

export const toolRoutes = new Hono()

toolRoutes.get('/', async (c) => {
  try {
    const tools = getUserTools()
    return c.json({
      count: tools.length,
      tools: tools.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        provider: t.provider,
        category: t.category,
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

    const tools = connections.flatMap((conn) =>
      conn.provider.toolDefinitions.map((t) => ({
        id: t.toolId,
        name: t.name,
        description: t.description,
        provider: conn.provider.provider,
        authType: t.authType,
      })),
    )

    return c.json({ count: tools.length, tools })
  } catch (error) {
    logger.error('Failed to list connected tools', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

// ─── Search endpoint ──────────────────────
toolRoutes.get('/search', async (c) => {
  try {
    const q = c.req.query('q')?.trim().slice(0, TOOL_QUERY_MAX_QUERY_LENGTH)
    const provider = c.req.query('provider')
    const category = c.req.query('category') as ToolCategory | undefined
    const authType = c.req.query('auth_type') as AuthType | undefined
    const readOnly = c.req.query('read_only') === 'true' ? true : undefined
    const limit = Math.min(
      Math.max(parseInt(c.req.query('limit') ?? '', 10) || TOOL_QUERY_DEFAULT_LIMIT, 1),
      TOOL_QUERY_MAX_LIMIT,
    )
    const offset = Math.max(parseInt(c.req.query('offset') ?? '', 10) || 0, 0)

    // No params → provider summary
    if (!q && !provider && !category && !authType && readOnly === undefined) {
      const categories = getToolCategories()
      const totalTools = getUserTools().length
      return c.json({
        message: `${totalTools} tools across ${Object.keys(categories).length} providers`,
        providers: Object.entries(categories).map(([p, count]) => ({
          provider: p,
          toolCount: count,
        })),
        totalTools,
      })
    }

    let tools = provider ? getToolsByProvider(provider) : getUserTools()

    // Filter by category
    if (category) tools = tools.filter((t) => t.category === category)
    // Filter by auth type
    if (authType) tools = tools.filter((t) => t.authType === authType)
    // Filter by readOnly annotation
    if (readOnly) tools = tools.filter((t) => t.annotations?.readOnlyHint === true)

    // Keyword search with scoring
    if (q) {
      const ql = q.toLowerCase()
      tools = tools
        .map((t) => {
          let score = 0
          if (t.id.toLowerCase() === ql) score += 100
          else if (t.id.toLowerCase().includes(ql)) score += 60
          if (t.name.toLowerCase().includes(ql)) score += 80
          if (t.description.toLowerCase().includes(ql)) score += 40
          if (t.provider.toLowerCase().includes(ql)) score += 20
          return { tool: t, score }
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
        .map((s) => s.tool)
    }

    const total = tools.length
    const paged = tools.slice(offset, offset + limit)

    return c.json({
      tools: paged.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        provider: t.provider,
        category: t.category,
        authType: t.authType,
        annotations: t.annotations,
      })),
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    logger.error('Failed to search tools', error)
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
      tools: tools.map((t) => ({
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
