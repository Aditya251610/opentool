// ─── Response types ───

export interface User {
  id: string
  email: string
  name: string | null
}

export interface UserProfile extends User {
  createdAt: string
  connectedToolsCount: number
}

export interface AuthResponse {
  user: User
  apiKey: string
}

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export interface ApiKeyCreated {
  key: string
  prefix: string
  name: string
}

export interface Tool {
  id: string
  name: string
  description: string
  provider: string
  authType: 'oauth2' | 'api_key' | 'none'
  category?: string
  annotations?: {
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
}

export interface ToolList {
  count: number
  tools: Tool[]
}

export interface ToolSearchOptions {
  query?: string
  provider?: string
  category?: string
  authType?: 'oauth2' | 'api_key' | 'none'
  readOnly?: boolean
  limit?: number
  offset?: number
}

export interface ToolSearchResult {
  tools: Tool[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface ToolDetails {
  id: string
  name: string
  description: string
  provider: string
  category: string
  authType: string
  requiredScopes: string[]
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown> | null
  annotations: {
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
}

export interface ProviderSummary {
  provider: string
  toolCount: number
}

export interface ToolSearchSummary {
  message: string
  providers: ProviderSummary[]
  totalTools: number
}

export interface ConnectUrl {
  url: string
}

export interface HealthStatus {
  status: 'ok'
  timestamp: string
}

export interface ToolExecutionResult {
  content: Array<{
    type: string
    text: string
  }>
  isError?: boolean
}

// ─── gRPC types ───

export interface ExecuteToolResponse {
  content: Array<{ type: string; text: string }>
  isError: boolean
  durationMs: number
}

export interface ExecuteToolProgress {
  status: string
  content: Array<{ type: string; text: string }>
  progressMessage: string
  error: { code: number; message: string; metadata: Record<string, string> } | null
  elapsedMs: number
  progressPercent: number
}

export interface ListToolsResponse {
  tools: Array<{
    id: string
    name: string
    description: string
    provider: string
    authType: string
    connected: boolean
    requiredScopes: string[]
  }>
  totalCount: number
}

export interface ToolSchema {
  toolId: string
  inputJsonSchema: string
  description: string
}

export interface HealthCheckResponse {
  status: string
  detail: {
    databaseOk: boolean
    redisOk: boolean
    timestamp: string
    serverVersion: string
  } | null
}

// ─── Request types ───

export interface SignupInput {
  email: string
  password: string
  name?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface CreateKeyInput {
  name: string
}

export interface UpdateProfileInput {
  name?: string | null
  email?: string
}

export interface ExecuteToolInput {
  tool: string
  args: Record<string, unknown>
}

// ─── Client config ───

export interface OpenToolConfig {
  /** Base URL of your OpenTool server (e.g. "http://localhost:3001") */
  baseUrl: string
  /** API key for authenticated requests (ot_xxx) */
  apiKey?: string
  /** Custom fetch implementation (defaults to global fetch) */
  fetch?: typeof globalThis.fetch
  /** Request timeout in ms (default: 30000) */
  timeout?: number
  /** Max retries for transient failures (default: 3) */
  maxRetries?: number
}

// ─── Errors ───

export class OpenToolError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message)
    this.name = 'OpenToolError'
  }
}

export class AuthenticationError extends OpenToolError {
  constructor(message = 'Invalid or missing API key') {
    super(message, 401)
    this.name = 'AuthenticationError'
  }
}

export class NotFoundError extends OpenToolError {
  constructor(message: string) {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}
