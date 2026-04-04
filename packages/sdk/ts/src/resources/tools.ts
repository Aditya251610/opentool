import { HttpClient } from '../http'
import type { Tool, ToolList, ToolExecutionResult } from '../types'

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
   * Execute a tool via the MCP JSON-RPC endpoint.
   *
   * @example
   * ```ts
   * const result = await client.tools.execute('github.create_issue', {
   *   owner: 'user',
   *   repo: 'my-repo',
   *   title: 'Bug report',
   * })
   * ```
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
