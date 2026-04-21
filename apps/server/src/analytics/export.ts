/**
 * Context export — generates portable agent context files from usage analytics.
 *
 * Formats:
 * - context.md  — Human-readable markdown with tool usage patterns
 * - memory.json — Structured JSON for programmatic consumption
 * - .cursorrules — Cursor-compatible rules file
 * - CLAUDE.md   — Claude-compatible project context
 */
import { getToolUsageStats, getUsageSummary, ToolUsageStats } from './usage'

// ─── Types ────────────────────────────────

export type ExportFormat = 'context.md' | 'memory.json' | '.cursorrules' | 'CLAUDE.md'
export const VALID_FORMATS: ExportFormat[] = [
  'context.md',
  'memory.json',
  '.cursorrules',
  'CLAUDE.md',
]

// ─── Helpers ──────────────────────────────

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return `${tokens}`
}

function getToolPatterns(stats: ToolUsageStats[]): {
  frequent: ToolUsageStats[]
  occasional: ToolUsageStats[]
  rare: ToolUsageStats[]
} {
  const sorted = [...stats].sort((a, b) => b.totalCalls - a.totalCalls)
  const total = sorted.reduce((sum, s) => sum + s.totalCalls, 0)
  let cumulative = 0

  const frequent: ToolUsageStats[] = []
  const occasional: ToolUsageStats[] = []
  const rare: ToolUsageStats[] = []

  for (const s of sorted) {
    cumulative += s.totalCalls
    if (cumulative <= total * 0.8) {
      frequent.push(s)
    } else if (cumulative <= total * 0.95) {
      occasional.push(s)
    } else {
      rare.push(s)
    }
  }

  return { frequent, occasional, rare }
}

// ─── Formatters ───────────────────────────

function generateContextMd(
  stats: ToolUsageStats[],
  summary: ReturnType<typeof getUsageSummary> extends Promise<infer T> ? T : never,
  days: number,
): string {
  const patterns = getToolPatterns(stats)
  const lines: string[] = [
    `# OpenTool Usage Context`,
    ``,
    `> Auto-generated from ${days}-day usage analytics. Provide this to your AI agent for optimized tool selection.`,
    ``,
    `## Summary`,
    `- **Total executions**: ${summary.totalExecutions}`,
    `- **Total tokens consumed**: ${formatTokenCount(summary.totalTokens)}`,
    `- **Avg tokens per call**: ${summary.avgTokensPerCall}`,
    `- **Period**: ${summary.periodStart.split('T')[0]} to ${summary.periodEnd.split('T')[0]}`,
    ``,
  ]

  if (patterns.frequent.length > 0) {
    lines.push(`## Frequently Used Tools`)
    lines.push(`These tools are used most often — prioritize them in tool selection:`)
    lines.push(``)
    for (const t of patterns.frequent) {
      lines.push(
        `- **${t.toolId}** — ${t.totalCalls} calls, ${formatTokenCount(t.totalTokens)} tokens, ${Math.round(t.successRate * 100)}% success, ~${t.avgDurationMs}ms avg`,
      )
    }
    lines.push(``)
  }

  if (patterns.occasional.length > 0) {
    lines.push(`## Occasionally Used Tools`)
    for (const t of patterns.occasional) {
      lines.push(
        `- **${t.toolId}** — ${t.totalCalls} calls, ${formatTokenCount(t.totalTokens)} tokens`,
      )
    }
    lines.push(``)
  }

  if (patterns.rare.length > 0) {
    lines.push(`## Rarely Used Tools`)
    lines.push(`These tools are seldom needed:`)
    lines.push(``)
    for (const t of patterns.rare) {
      lines.push(`- ${t.toolId} (${t.totalCalls} calls)`)
    }
    lines.push(``)
  }

  lines.push(`## Token Budget Guidance`)
  lines.push(
    `- Prefer tools with lower avg tokens when multiple tools can accomplish the same task`,
  )
  if (stats.length > 0) {
    const sorted = [...stats].sort((a, b) => a.avgTokensPerCall - b.avgTokensPerCall)
    lines.push(
      `- Most token-efficient: **${sorted[0].toolId}** (~${sorted[0].avgTokensPerCall} tokens/call)`,
    )
    if (sorted.length > 1) {
      const heaviest = sorted[sorted.length - 1]
      lines.push(
        `- Most token-heavy: **${heaviest.toolId}** (~${heaviest.avgTokensPerCall} tokens/call)`,
      )
    }
  }

  return lines.join('\n')
}

function generateMemoryJson(
  stats: ToolUsageStats[],
  summary: ReturnType<typeof getUsageSummary> extends Promise<infer T> ? T : never,
  days: number,
): string {
  const patterns = getToolPatterns(stats)

  const memory = {
    version: '1.0',
    generator: 'opentool',
    periodDays: days,
    summary: {
      totalExecutions: summary.totalExecutions,
      totalTokens: summary.totalTokens,
      avgTokensPerCall: summary.avgTokensPerCall,
      periodStart: summary.periodStart,
      periodEnd: summary.periodEnd,
    },
    toolPreferences: {
      frequent: patterns.frequent.map((t) => ({
        toolId: t.toolId,
        calls: t.totalCalls,
        tokens: t.totalTokens,
        avgTokens: t.avgTokensPerCall,
        successRate: t.successRate,
        avgDurationMs: t.avgDurationMs,
      })),
      occasional: patterns.occasional.map((t) => ({
        toolId: t.toolId,
        calls: t.totalCalls,
        tokens: t.totalTokens,
      })),
      rare: patterns.rare.map((t) => t.toolId),
    },
    clients: summary.topClients,
  }

  return JSON.stringify(memory, null, 2)
}

function generateCursorRules(
  stats: ToolUsageStats[],
  _summary: ReturnType<typeof getUsageSummary> extends Promise<infer T> ? T : never,
): string {
  const patterns = getToolPatterns(stats)
  const lines: string[] = [
    `# OpenTool MCP Usage Rules`,
    `# Auto-generated — place in project root as .cursorrules`,
    ``,
    `# When using OpenTool MCP tools, prefer these frequently-used tools:`,
  ]

  for (const t of patterns.frequent) {
    lines.push(
      `# - ${t.toolId} (${t.totalCalls} uses, ${Math.round(t.successRate * 100)}% success)`,
    )
  }

  lines.push(``)
  lines.push(`# Token-efficient tool selection:`)

  const sorted = [...stats]
    .filter((s) => s.totalCalls >= 3)
    .sort((a, b) => a.avgTokensPerCall - b.avgTokensPerCall)
  for (const t of sorted.slice(0, 5)) {
    lines.push(`# - ${t.toolId}: ~${t.avgTokensPerCall} tokens/call`)
  }

  if (patterns.rare.length > 0) {
    lines.push(``)
    lines.push(`# Rarely needed tools (only use when explicitly requested):`)
    for (const t of patterns.rare) {
      lines.push(`# - ${t.toolId}`)
    }
  }

  return lines.join('\n')
}

function generateClaudeMd(
  stats: ToolUsageStats[],
  summary: ReturnType<typeof getUsageSummary> extends Promise<infer T> ? T : never,
  days: number,
): string {
  const patterns = getToolPatterns(stats)
  const lines: string[] = [
    `# CLAUDE.md — OpenTool Context`,
    ``,
    `This file provides context about how MCP tools from OpenTool are used in this project.`,
    `Generated from ${days}-day analytics.`,
    ``,
    `## Tool Usage Patterns`,
    ``,
    `Total: ${summary.totalExecutions} executions, ${formatTokenCount(summary.totalTokens)} tokens consumed.`,
    ``,
  ]

  if (patterns.frequent.length > 0) {
    lines.push(`### Primary tools (use these first):`)
    for (const t of patterns.frequent) {
      lines.push(
        `- \`${t.toolId}\` — ${t.totalCalls} calls, ~${t.avgTokensPerCall} tokens/call, ${Math.round(t.successRate * 100)}% success`,
      )
    }
    lines.push(``)
  }

  if (patterns.occasional.length > 0) {
    lines.push(`### Secondary tools:`)
    for (const t of patterns.occasional) {
      lines.push(`- \`${t.toolId}\` — ${t.totalCalls} calls`)
    }
    lines.push(``)
  }

  lines.push(`## Guidelines`)
  lines.push(
    `- When multiple tools can accomplish a task, prefer the one with lower avg tokens/call`,
  )
  lines.push(`- Use meta_search_tools to discover tools not listed here`)
  lines.push(`- All tool auth is handled automatically via OpenTool`)

  return lines.join('\n')
}

// ─── Public API ───────────────────────────

export async function generateExport(
  userId: string,
  format: ExportFormat,
  days: number = 30,
): Promise<string> {
  const [stats, summary] = await Promise.all([
    getToolUsageStats(userId, days),
    getUsageSummary(userId, days),
  ])

  switch (format) {
    case 'context.md':
      return generateContextMd(stats, summary, days)
    case 'memory.json':
      return generateMemoryJson(stats, summary, days)
    case '.cursorrules':
      return generateCursorRules(stats, summary)
    case 'CLAUDE.md':
      return generateClaudeMd(stats, summary, days)
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}
