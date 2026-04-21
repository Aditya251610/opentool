/**
 * Analytics REST API routes.
 *
 * GET /api/analytics/tools      — per-tool usage stats
 * GET /api/analytics/summary    — aggregated usage summary
 * GET /api/analytics/export     — context export in various formats
 */
import { Hono } from 'hono'
import { getToolUsageStats, getUsageSummary } from '../../analytics/usage'
import { generateExport, ExportFormat, VALID_FORMATS } from '../../analytics/export'
import { resolveApiKey } from '../../auth/broker'
import { logger } from '../../logger'

export const analyticsRoutes = new Hono()

/** Extract and validate user from Bearer token */
async function resolveUser(authHeader: string | undefined) {
  if (!authHeader) return null
  let token = authHeader
  if (token.startsWith('Bearer ')) token = token.slice(7).trim()
  if (token.startsWith('Bearer ')) token = token.slice(7).trim()
  if (!token) return null
  return resolveApiKey(token)
}

// ─── Per-tool stats ───────────────────────

analyticsRoutes.get('/tools', async (c) => {
  const user = await resolveUser(c.req.header('Authorization'))
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const days = Math.min(Math.max(Number(c.req.query('days') ?? 30), 1), 365)

  try {
    const stats = await getToolUsageStats(user.id, days)
    return c.json({ tools: stats, days })
  } catch (error) {
    logger.error('Analytics tools error', { error })
    return c.json({ error: 'Failed to fetch analytics' }, 500)
  }
})

// ─── Usage summary ────────────────────────

analyticsRoutes.get('/summary', async (c) => {
  const user = await resolveUser(c.req.header('Authorization'))
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const days = Math.min(Math.max(Number(c.req.query('days') ?? 30), 1), 365)

  try {
    const summary = await getUsageSummary(user.id, days)
    return c.json(summary)
  } catch (error) {
    logger.error('Analytics summary error', { error })
    return c.json({ error: 'Failed to fetch summary' }, 500)
  }
})

// ─── Context export ───────────────────────

analyticsRoutes.get('/export', async (c) => {
  const user = await resolveUser(c.req.header('Authorization'))
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const format = (c.req.query('format') ?? 'context.md') as ExportFormat
  if (!VALID_FORMATS.includes(format)) {
    return c.json({ error: `Invalid format. Valid: ${VALID_FORMATS.join(', ')}` }, 400)
  }

  const days = Math.min(Math.max(Number(c.req.query('days') ?? 30), 1), 365)

  try {
    const result = await generateExport(user.id, format, days)
    const contentTypeMap: Record<ExportFormat, string> = {
      'context.md': 'text/markdown',
      'memory.json': 'application/json',
      '.cursorrules': 'text/plain',
      'CLAUDE.md': 'text/markdown',
    }

    return new Response(result, {
      status: 200,
      headers: {
        'Content-Type': contentTypeMap[format],
        'Content-Disposition': `attachment; filename="${format}"`,
      },
    })
  } catch (error) {
    logger.error('Analytics export error', { error })
    return c.json({ error: 'Failed to generate export' }, 500)
  }
})
