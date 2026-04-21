import { ToolDefinition, ToolCategory, AuthType } from '@opentool/tool-schema'
import {
  TOOL_QUERY_DEFAULT_LIMIT,
  TOOL_QUERY_MAX_LIMIT,
  TOOL_QUERY_MAX_QUERY_LENGTH,
  META_PROVIDER,
} from '../../src/constants'

// ─── Types ────────────────────────────────

export interface SearchOptions {
  query?: string
  provider?: string
  category?: ToolCategory
  authType?: AuthType
  readOnly?: boolean
  destructive?: boolean
  connectedOnly?: boolean
  excludeMeta?: boolean
  limit?: number
  offset?: number
}

export interface ToolSummary {
  id: string
  name: string
  description: string
  provider: string
  category: ToolCategory
  authType: AuthType
  annotations: {
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
  connected: boolean
}

export interface SearchResult {
  tools: ToolSummary[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface ProviderSummary {
  provider: string
  toolCount: number
  categories: ToolCategory[]
}

// ─── Scoring ──────────────────────────────

/** Weights for relevance scoring */
const SCORE_EXACT_ID = 100
const SCORE_ID_CONTAINS = 60
const SCORE_NAME_MATCH = 80
const SCORE_DESCRIPTION_MATCH = 40
const SCORE_PROVIDER_MATCH = 20
const SCORE_USAGE_BOOST_MAX = 30

/**
 * Computes a relevance score for a tool against a search query.
 * Higher score = better match. Returns 0 if no match.
 * Optionally boosts score based on usage frequency (logarithmic).
 */
export function scoreTool(
  tool: ToolDefinition<any>,
  query: string,
  usageCount: number = 0,
): number {
  if (!query) return 1 // All tools match with equal score when no query

  const q = query.toLowerCase().trim()
  const id = tool.id.toLowerCase()
  const name = tool.name.toLowerCase()
  const desc = tool.description.toLowerCase()
  const provider = tool.provider.toLowerCase()

  let score = 0

  if (id === q) {
    score += SCORE_EXACT_ID
  } else if (id.includes(q)) {
    score += SCORE_ID_CONTAINS
  }

  if (name.includes(q)) {
    score += SCORE_NAME_MATCH
  }

  if (desc.includes(q)) {
    score += SCORE_DESCRIPTION_MATCH
  }

  if (provider.includes(q)) {
    score += SCORE_PROVIDER_MATCH
  }

  // Logarithmic usage boost — diminishing returns past ~50 uses
  if (usageCount > 0 && score > 0) {
    score += Math.min(Math.log2(usageCount + 1) * 5, SCORE_USAGE_BOOST_MAX)
  }

  return score
}

// ─── Search Engine ────────────────────────

/**
 * Sanitizes a search query: strips control chars, trims, caps length.
 */
function sanitizeQuery(query: string): string {
  return query
    .replace(/[\x00-\x1f\x7f]/g, '') // strip control characters
    .trim()
    .slice(0, TOOL_QUERY_MAX_QUERY_LENGTH)
}

/**
 * Builds a compact summary of a tool for search results.
 */
export function buildToolSummary(tool: ToolDefinition<any>, connected: boolean): ToolSummary {
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    provider: tool.provider,
    category: tool.category,
    authType: tool.authType,
    annotations: tool.annotations,
    connected,
  }
}

/**
 * Returns a summary of tools grouped by provider — useful when no query is provided.
 * @param tools The full list of tools to summarize (caller passes from registry)
 */
export function getProviderSummary(tools: ToolDefinition<any>[]): ProviderSummary[] {
  const grouped = new Map<string, { tools: ToolDefinition<any>[] }>()

  for (const tool of tools) {
    if (tool.provider === META_PROVIDER) continue
    const existing = grouped.get(tool.provider)
    if (existing) {
      existing.tools.push(tool)
    } else {
      grouped.set(tool.provider, { tools: [tool] })
    }
  }

  const summaries: ProviderSummary[] = []
  for (const [provider, { tools: providerTools }] of grouped) {
    const categories = [...new Set(providerTools.map((t) => t.category))]
    summaries.push({
      provider,
      toolCount: providerTools.length,
      categories,
    })
  }

  return summaries.sort((a, b) => a.provider.localeCompare(b.provider))
}

/**
 * Main search function — filters, scores, paginates tools from the provided list.
 *
 * @param options Search/filter criteria
 * @param allTools The full list of tools to search (caller passes from registry)
 * @param connectedProviders Set of provider names the user has connected (pass empty set to skip filtering)
 * @param usageMap Optional tool usage frequency map for scoring boost
 */
export function searchToolRegistry(
  options: SearchOptions,
  allTools: ToolDefinition<any>[],
  connectedProviders: Set<string> = new Set(),
  usageMap: Record<string, number> = {},
): SearchResult {
  const limit = Math.min(
    Math.max(options.limit ?? TOOL_QUERY_DEFAULT_LIMIT, 1),
    TOOL_QUERY_MAX_LIMIT,
  )
  const offset = Math.max(options.offset ?? 0, 0)

  let tools: ToolDefinition<any>[]

  // Start with provider-scoped list if specified
  if (options.provider) {
    tools = allTools.filter((t) => t.provider === options.provider)
  } else {
    tools = [...allTools]
  }

  // Exclude meta-tools from search results by default
  if (options.excludeMeta !== false) {
    tools = tools.filter((t) => t.provider !== META_PROVIDER)
  }

  // Filter by category
  if (options.category) {
    tools = tools.filter((t) => t.category === options.category)
  }

  // Filter by auth type
  if (options.authType) {
    tools = tools.filter((t) => t.authType === options.authType)
  }

  // Filter by annotations
  if (options.readOnly === true) {
    tools = tools.filter((t) => t.annotations.readOnlyHint === true)
  }
  if (options.destructive === true) {
    tools = tools.filter((t) => t.annotations.destructiveHint === true)
  }

  // Filter by connection status
  if (options.connectedOnly) {
    tools = tools.filter((t) => t.authType === 'none' || connectedProviders.has(t.provider))
  }

  // Score and sort by relevance
  const query = options.query ? sanitizeQuery(options.query) : ''
  let scored = tools.map((t) => ({
    tool: t,
    score: scoreTool(t, query, usageMap[t.id] ?? 0),
  }))

  // If there's a query, remove non-matching tools (score 0)
  if (query) {
    scored = scored.filter((s) => s.score > 0)
  }

  // Sort: highest score first, then alphabetically by name
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.tool.name.localeCompare(b.tool.name)
  })

  const total = scored.length
  const paged = scored.slice(offset, offset + limit)

  return {
    tools: paged.map((s) =>
      buildToolSummary(
        s.tool,
        s.tool.authType === 'none' || connectedProviders.has(s.tool.provider),
      ),
    ),
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  }
}
