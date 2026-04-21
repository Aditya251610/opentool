import { defineTool, z } from '@opentool/tool-schema'
import { searchToolRegistry, getProviderSummary } from './search'
import { META_PROVIDER, TOOL_QUERY_MAX_LIMIT } from '../../src/constants'

// Late-bind registry imports to avoid circular dependency at module load.
// These are resolved at call time (when a tool is executed), not at import time.
// We use a cached promise to avoid re-importing on every call.
let _registry: any = null
let _toolExecutor: any = null

async function getRegistry() {
  if (!_registry) {
    _registry = await import('../../src/registry')
  }
  return _registry as {
    getToolById: (id: string) => import('@opentool/tool-schema').ToolDefinition<any> | undefined
    getAllTools: () => import('@opentool/tool-schema').ToolDefinition<any>[]
    getUserTools: () => import('@opentool/tool-schema').ToolDefinition<any>[]
  }
}

async function getToolExecutor() {
  if (!_toolExecutor) {
    _toolExecutor = await import('../../src/mcp/tools')
  }
  return _toolExecutor as {
    executeTool: (
      toolId: string,
      input: unknown,
      userId: string,
      clientName?: string,
    ) => Promise<unknown>
  }
}

// ─── search_tools ─────────────────────────

export const searchToolsMeta = defineTool({
  id: 'meta_search_tools',
  name: 'Search Available Tools',
  description: [
    'Search and filter the OpenTool registry to discover available tools.',
    'Use this to find tools by keyword, provider, category, or capability.',
    '',
    'Filters: provider (github, slack, gmail, etc.), category (development, communication, email, productivity, database, payments, infrastructure),',
    'auth_type (oauth2, api_key, none), read_only (true = safe read tools), connected_only (true = only tools the user has authenticated).',
    '',
    'With no query, returns a summary of all providers and tool counts.',
    '',
    'Returns: { tools: [{ id, name, description, provider, category, authType, annotations, connected }], total, limit, offset, hasMore }',
  ].join('\n'),
  provider: META_PROVIDER,
  authType: 'none',
  category: 'meta',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: z.object({
    query: z.string().max(200).optional().describe('Search by tool name, description, or ID'),
    provider: z.string().optional().describe('Filter by provider (e.g. github, slack, gmail)'),
    category: z
      .enum([
        'development',
        'communication',
        'email',
        'productivity',
        'database',
        'payments',
        'infrastructure',
      ])
      .optional()
      .describe('Filter by tool category'),
    auth_type: z
      .enum(['oauth2', 'api_key', 'none'])
      .optional()
      .describe('Filter by authentication type'),
    read_only: z.boolean().optional().describe('If true, return only read-only (safe) tools'),
    connected_only: z
      .boolean()
      .optional()
      .describe('If true, return only tools the user has connected'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(TOOL_QUERY_MAX_LIMIT)
      .optional()
      .describe('Max results to return (default 20, max 50)'),
    offset: z.number().int().min(0).optional().describe('Offset for pagination'),
  }),
  execute: async ({ input, auth: _auth }) => {
    // If no query and no filters, return provider summary
    const hasFilters =
      input.query ||
      input.provider ||
      input.category ||
      input.auth_type ||
      input.read_only !== undefined ||
      input.connected_only

    if (!hasFilters) {
      const { getUserTools } = await getRegistry()
      const userTools = getUserTools()
      const summary = getProviderSummary(userTools)
      return {
        message: `${userTools.length} tools available across ${summary.length} providers. Use query or filters to search.`,
        providers: summary,
        totalTools: userTools.length,
      }
    }

    const { getUserTools } = await getRegistry()
    const connectedProviders = new Set<string>()

    const result = searchToolRegistry(
      {
        query: input.query,
        provider: input.provider,
        category: input.category,
        authType: input.auth_type,
        readOnly: input.read_only,
        connectedOnly: input.connected_only,
        limit: input.limit,
        offset: input.offset,
      },
      getUserTools(),
      connectedProviders,
    )

    return result
  },
})

// ─── get_tool_details ─────────────────────

export const getToolDetailsMeta = defineTool({
  id: 'meta_get_tool_details',
  name: 'Get Tool Details',
  description: [
    'Get the full schema and metadata for a specific tool by its ID.',
    'Call this before meta_execute_dynamic_tool to understand the required input format.',
    '',
    'Returns: { id, name, description, provider, category, authType, requiredScopes, inputSchema (JSON Schema), annotations, connected }',
  ].join('\n'),
  provider: META_PROVIDER,
  authType: 'none',
  category: 'meta',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: z.object({
    tool_id: z
      .string()
      .min(1)
      .describe('The tool ID to get details for (e.g. github_create_issue)'),
  }),
  execute: async ({ input }) => {
    const { getToolById } = await getRegistry()
    const tool = getToolById(input.tool_id)
    if (!tool) {
      return {
        error: `Tool "${input.tool_id}" not found.`,
        suggestion: 'Use meta_search_tools to find available tools.',
      }
    }

    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      provider: tool.provider,
      category: tool.category,
      authType: tool.authType,
      requiredScopes: tool.requiredScopes,
      inputSchema: tool.inputJsonSchema,
      outputSchema: tool.outputJsonSchema ?? null,
      annotations: tool.annotations,
    }
  },
})

// ─── execute_dynamic_tool ─────────────────

export const executeDynamicToolMeta = defineTool({
  id: 'meta_execute_dynamic_tool',
  name: 'Execute Dynamic Tool',
  description: [
    'Execute any tool by its ID with the given arguments.',
    'Use meta_search_tools to discover tools, meta_get_tool_details to see the schema, then call this to execute.',
    '',
    "The arguments object must match the tool's input schema exactly.",
    'Authentication is handled automatically — if the tool requires auth and the user is not connected,',
    'you will receive an auth URL to share with the user.',
    '',
    'Input: { tool_id: string, arguments: { ...tool-specific args } }',
  ].join('\n'),
  provider: META_PROVIDER,
  authType: 'none',
  category: 'meta',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    tool_id: z.string().min(1).describe('The tool ID to execute (e.g. github_create_issue)'),
    arguments: z
      .record(z.unknown())
      .default({})
      .describe('Arguments to pass to the tool, matching its input schema'),
  }),
  execute: async ({ input, auth }) => {
    // Block meta-tool recursion — prevent infinite loops
    if (input.tool_id.startsWith('meta_')) {
      return {
        error: `Cannot execute meta-tools through meta_execute_dynamic_tool.`,
        suggestion: 'Call meta-tools directly instead of through this tool.',
      }
    }

    const { getToolById } = await getRegistry()
    const tool = getToolById(input.tool_id)
    if (!tool) {
      return {
        error: `Tool "${input.tool_id}" not found.`,
        suggestion: 'Use meta_search_tools to find available tools.',
      }
    }

    // Delegate to the existing execution pipeline (auth, validation, audit, timeout)
    const { executeTool } = await getToolExecutor()
    const result = await executeTool(input.tool_id, input.arguments, auth.userId, auth.clientName)
    return result
  },
})

// ─── Export ───────────────────────────────

export const metaTools = [searchToolsMeta, getToolDetailsMeta, executeDynamicToolMeta]
