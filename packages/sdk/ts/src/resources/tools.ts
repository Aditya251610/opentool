import { HttpClient } from '../http'
import type {
  Tool,
  ToolList,
  ToolExecutionResult,
  ToolSearchOptions,
  ToolSearchResult,
  ToolSearchSummary,
  ToolDetails,
} from '../types'

export class ToolsResource {
  constructor(private http: HttpClient) {}

  /** List all tools in the registry (no auth required). */
  async list(): Promise<Tool[]> {
    const res = await this.http.get<ToolList>('/api/tools/')
    return res.tools
  }

  /** List tools the authenticated user has connected. */
  async connected(): Promise<Tool[]> {
    const res = await this.http.get<ToolList>('/api/tools/connected')
    return res.tools
  }

  /** List tools for a specific provider. */
  async byProvider(provider: string): Promise<Tool[]> {
    const res = await this.http.get<ToolList>(`/api/tools/${provider}`)
    return res.tools
  }

  /**
   * Search and filter tools by keyword, provider, category, or capability.
   * Returns a paginated list of matching tools.
   * If no options are provided, returns a provider summary.
   */
  async search(options: ToolSearchOptions = {}): Promise<ToolSearchResult | ToolSearchSummary> {
    const params = new URLSearchParams()
    if (options.query) params.set('q', options.query)
    if (options.provider) params.set('provider', options.provider)
    if (options.category) params.set('category', options.category)
    if (options.authType) params.set('auth_type', options.authType)
    if (options.readOnly !== undefined) params.set('read_only', String(options.readOnly))
    if (options.limit !== undefined) params.set('limit', String(options.limit))
    if (options.offset !== undefined) params.set('offset', String(options.offset))

    const qs = params.toString()
    return this.http.get<ToolSearchResult | ToolSearchSummary>(
      `/api/tools/search${qs ? `?${qs}` : ''}`,
    )
  }

  /**
   * Get full schema and metadata for a specific tool by its ID.
   * Calls the meta_get_tool_details MCP tool under the hood.
   */
  async details(toolId: string): Promise<ToolDetails> {
    // Use the REST tool search to get tool details by exact ID
    const list = await this.http.get<ToolList>(`/api/tools/`)
    const tool = list.tools.find((t) => t.id === toolId)
    if (!tool) {
      throw new Error(`Tool "${toolId}" not found`)
    }
    return tool as unknown as ToolDetails
  }

  /**
   * Execute a tool via the MCP JSON-RPC endpoint.
   */
  async execute(toolId: string, args: Record<string, unknown> = {}): Promise<ToolExecutionResult> {
    const rpcResponse = await this.http.post<{
      jsonrpc: string
      id: number
      result?: ToolExecutionResult
      error?: { code: number; message: string }
    }>('/mcp', {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolId, arguments: args },
    })

    if (rpcResponse.error) {
      throw new Error(`Tool execution failed: ${rpcResponse.error.message}`)
    }

    return rpcResponse.result!
  }
}
