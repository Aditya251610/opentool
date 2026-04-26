import { HttpClient } from './http'
import { AuthResource } from './resources/auth'
import { UsersResource } from './resources/users'
import { KeysResource } from './resources/keys'
import { ToolsResource } from './resources/tools'
import { AnalyticsResource } from './resources/analytics'
import type { OpenToolConfig, HealthStatus } from './types'

/**
 * OpenTool SDK client.
 *
 * @example
 * ```ts
 * import { OpenTool } from '@opentool-ts/sdk'
 *
 * const client = new OpenTool({
 *   baseUrl: 'http://localhost:3001',
 *   apiKey: 'ot_your_key_here',
 * })
 *
 * // List connected tools
 * const tools = await client.tools.connected()
 *
 * // Execute a tool
 * const result = await client.tools.execute('github.create_issue', {
 *   owner: 'user',
 *   repo: 'my-repo',
 *   title: 'Created via SDK',
 * })
 *
 * // Manage API keys
 * const keys = await client.keys.list()
 * ```
 */
export class OpenTool {
  private http: HttpClient

  /** Auth operations: signup, login, connect/disconnect providers. */
  readonly auth: AuthResource

  /** User profile operations. */
  readonly users: UsersResource

  /** API key management. */
  readonly keys: KeysResource

  /** Tool listing, provider browsing, and execution. */
  readonly tools: ToolsResource

  /** Usage analytics, token stats, and context export. */
  readonly analytics: AnalyticsResource

  constructor(config: OpenToolConfig) {
    this.http = new HttpClient(config)
    this.auth = new AuthResource(this.http)
    this.users = new UsersResource(this.http)
    this.keys = new KeysResource(this.http)
    this.tools = new ToolsResource(this.http)
    this.analytics = new AnalyticsResource(this.http)
  }

  /** Set or replace the API key used for authenticated requests. */
  setApiKey(key: string) {
    this.http.setApiKey(key)
  }

  /** Clear the current API key. */
  clearApiKey() {
    this.http.clearApiKey()
  }

  /** Check server health. No auth required. */
  async health(): Promise<HealthStatus> {
    return this.http.get<HealthStatus>('/health')
  }
}
