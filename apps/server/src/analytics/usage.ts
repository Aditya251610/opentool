/**
 * Usage analytics service — aggregates audit logs into per-tool stats.
 *
 * All queries use Prisma aggregates on audit_logs table.
 * Results are cached in Redis with 5-minute TTL for dashboard performance.
 */
import { prisma } from '../db/client'
import { redis } from '../db/redis'
import { AuditAction, AuditStatus } from '@prisma/client'
import { logger } from '../logger'

// ─── Types ────────────────────────────────

export interface ToolUsageStats {
  toolId: string
  toolDefinitionId: string | null
  totalCalls: number
  successCount: number
  failureCount: number
  successRate: number
  avgDurationMs: number
  totalInputTokens: number
  totalOutputTokens: number
  totalSchemaTokens: number
  totalTokens: number
  avgTokensPerCall: number
  lastUsedAt: string | null
}

export interface UsageSummary {
  totalExecutions: number
  totalTokens: number
  avgTokensPerCall: number
  topTools: { toolId: string; calls: number; tokens: number }[]
  topClients: { clientName: string; calls: number }[]
  periodStart: string
  periodEnd: string
}

export interface ToolFrequencyMap {
  [toolId: string]: number
}

// ─── Cache ────────────────────────────────

const CACHE_TTL = 300 // 5 minutes
const CACHE_PREFIX = 'ot:analytics'

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(`${CACHE_PREFIX}:${key}`)
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

async function setCache(key: string, data: unknown): Promise<void> {
  try {
    await redis.set(`${CACHE_PREFIX}:${key}`, JSON.stringify(data), 'EX', CACHE_TTL)
  } catch (error) {
    logger.warn('Analytics cache write failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
  }
}

// ─── Queries ──────────────────────────────

/**
 * Get per-tool usage stats for a user within a time range.
 */
export async function getToolUsageStats(
  userId: string,
  days: number = 30,
): Promise<ToolUsageStats[]> {
  const cacheKey = `tools:${userId}:${days}`
  const cached = await getCached<ToolUsageStats[]>(cacheKey)
  if (cached) return cached

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const stats = await prisma.auditLog.groupBy({
    by: ['toolDefinitionId'],
    where: {
      userId,
      action: AuditAction.TOOL_EXECUTE,
      createdAt: { gte: since },
      toolDefinitionId: { not: null },
    },
    _count: { id: true },
    _avg: { durationMs: true, totalTokens: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      schemaTokens: true,
      totalTokens: true,
    },
    _max: { createdAt: true },
  })

  // Get success/failure counts
  const statusCounts = await prisma.auditLog.groupBy({
    by: ['toolDefinitionId', 'status'],
    where: {
      userId,
      action: AuditAction.TOOL_EXECUTE,
      createdAt: { gte: since },
      toolDefinitionId: { not: null },
    },
    _count: { id: true },
  })

  // Get toolId mapping
  const toolDefs = await prisma.toolDefinition.findMany({
    where: {
      id: { in: stats.map((s) => s.toolDefinitionId!).filter(Boolean) },
    },
    select: { id: true, toolId: true },
  })
  const toolIdMap = new Map(toolDefs.map((t) => [t.id, t.toolId]))

  // Build status lookup
  const statusMap = new Map<string, { success: number; failure: number }>()
  for (const sc of statusCounts) {
    const key = sc.toolDefinitionId ?? ''
    const existing = statusMap.get(key) ?? { success: 0, failure: 0 }
    if (sc.status === AuditStatus.SUCCESS) existing.success = sc._count.id
    if (sc.status === AuditStatus.FAILURE) existing.failure = sc._count.id
    statusMap.set(key, existing)
  }

  const result: ToolUsageStats[] = stats.map((s) => {
    const defId = s.toolDefinitionId ?? ''
    const sc = statusMap.get(defId) ?? { success: 0, failure: 0 }
    const totalCalls = s._count.id
    return {
      toolId: toolIdMap.get(defId) ?? defId,
      toolDefinitionId: s.toolDefinitionId,
      totalCalls,
      successCount: sc.success,
      failureCount: sc.failure,
      successRate: totalCalls > 0 ? sc.success / totalCalls : 0,
      avgDurationMs: Math.round(s._avg.durationMs ?? 0),
      totalInputTokens: s._sum.inputTokens ?? 0,
      totalOutputTokens: s._sum.outputTokens ?? 0,
      totalSchemaTokens: s._sum.schemaTokens ?? 0,
      totalTokens: s._sum.totalTokens ?? 0,
      avgTokensPerCall: Math.round(s._avg.totalTokens ?? 0),
      lastUsedAt: s._max.createdAt?.toISOString() ?? null,
    }
  })

  result.sort((a, b) => b.totalCalls - a.totalCalls)
  await setCache(cacheKey, result)
  return result
}

/**
 * Get aggregated usage summary for a user.
 */
export async function getUsageSummary(userId: string, days: number = 30): Promise<UsageSummary> {
  const cacheKey = `summary:${userId}:${days}`
  const cached = await getCached<UsageSummary>(cacheKey)
  if (cached) return cached

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [totals, byClient] = await Promise.all([
    prisma.auditLog.aggregate({
      where: {
        userId,
        action: AuditAction.TOOL_EXECUTE,
        createdAt: { gte: since },
      },
      _count: { id: true },
      _sum: { totalTokens: true },
      _avg: { totalTokens: true },
    }),
    prisma.auditLog.groupBy({
      by: ['clientName'],
      where: {
        userId,
        action: AuditAction.TOOL_EXECUTE,
        createdAt: { gte: since },
        clientName: { not: null },
      },
      _count: { id: true },
    }),
  ])

  const toolStats = await getToolUsageStats(userId, days)

  const result: UsageSummary = {
    totalExecutions: totals._count.id,
    totalTokens: totals._sum.totalTokens ?? 0,
    avgTokensPerCall: Math.round(totals._avg.totalTokens ?? 0),
    topTools: toolStats.slice(0, 10).map((t) => ({
      toolId: t.toolId,
      calls: t.totalCalls,
      tokens: t.totalTokens,
    })),
    topClients: byClient
      .map((c) => ({ clientName: c.clientName ?? 'unknown', calls: c._count.id }))
      .sort((a, b) => b.calls - a.calls),
    periodStart: since.toISOString(),
    periodEnd: new Date().toISOString(),
  }

  await setCache(cacheKey, result)
  return result
}

/**
 * Get tool usage frequency map for search boost scoring.
 * Returns { toolId: callCount } for the user's last N days.
 */
export async function getToolFrequencyMap(
  userId: string,
  days: number = 30,
): Promise<ToolFrequencyMap> {
  const cacheKey = `freq:${userId}:${days}`
  const cached = await getCached<ToolFrequencyMap>(cacheKey)
  if (cached) return cached

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const counts = await prisma.auditLog.groupBy({
    by: ['toolDefinitionId'],
    where: {
      userId,
      action: AuditAction.TOOL_EXECUTE,
      status: AuditStatus.SUCCESS,
      createdAt: { gte: since },
      toolDefinitionId: { not: null },
    },
    _count: { id: true },
  })

  const toolDefs = await prisma.toolDefinition.findMany({
    where: {
      id: { in: counts.map((c) => c.toolDefinitionId!).filter(Boolean) },
    },
    select: { id: true, toolId: true },
  })
  const toolIdMap = new Map(toolDefs.map((t) => [t.id, t.toolId]))

  const freqMap: ToolFrequencyMap = {}
  for (const c of counts) {
    const toolId = toolIdMap.get(c.toolDefinitionId ?? '') ?? c.toolDefinitionId ?? ''
    freqMap[toolId] = c._count.id
  }

  await setCache(cacheKey, freqMap)
  return freqMap
}
