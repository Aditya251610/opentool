import { loadConfig } from './config.js'
import { debug, debugHttp } from './debug.js'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public hint?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

/** Structured exit codes for scripting. */
export const EXIT = { OK: 0, GENERAL: 1, AUTH: 2, NETWORK: 3, NOT_FOUND: 4, TOOL: 5 } as const

export function exitCodeFor(err: unknown): number {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return EXIT.AUTH
    if (err.status === 404) return EXIT.NOT_FOUND
    return EXIT.GENERAL
  }
  if (err instanceof NetworkError) return EXIT.NETWORK
  return EXIT.GENERAL
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH'
  body?: unknown
  timeoutMs?: number
  requireAuth?: boolean
}

const DEFAULT_TIMEOUT = 15_000

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const config = loadConfig()
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT, requireAuth = true } = opts

  if (requireAuth && !config.apiKey) {
    throw new ApiError(
      401,
      'Not authenticated',
      'Run "opentool login" or "opentool set-key <api-key>"',
    )
  }

  const headers: Record<string, string> = {}
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const url = `${config.serverUrl}${path}`
  const MAX_RETRIES = 2
  let res!: Response
  let lastErr: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) debug('api', `retry ${attempt}/${MAX_RETRIES} for ${method} ${path}`)
    const t0 = Date.now()
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      })
      debugHttp(method, path, res.status, Date.now() - t0)
      lastErr = null
      break
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      debugHttp(method, path, undefined, Date.now() - t0)
      debug('api', `error: ${lastErr.message}`)
      const msg = lastErr.message
      if (msg.includes('timed out') || msg.includes('aborted')) {
        throw new NetworkError(`Request timed out after ${timeoutMs}ms`)
      }
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
        continue
      }
    }
  }

  if (lastErr) {
    throw new NetworkError(
      `Cannot reach ${config.serverUrl} — ${lastErr.message}. Is the server running? Try: docker compose up`,
    )
  }

  let data: unknown
  const text = await res.text()
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    const errMsg =
      (data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null) ??
      res.statusText ??
      `HTTP ${res.status}`
    let hint: string | undefined
    if (res.status === 401)
      hint = 'Your API key may be invalid or revoked. Run "opentool login" again.'
    else if (res.status === 403) hint = 'You may not have access to this resource.'
    else if (res.status === 404) hint = 'Check the path or resource ID.'
    else if (res.status === 429) hint = 'Rate limited — wait a moment and retry.'
    else if (res.status >= 500) hint = 'Server error — check server logs.'
    throw new ApiError(res.status, errMsg, hint)
  }

  return data as T
}

export async function checkHealth(url?: string): Promise<boolean> {
  const target = url ?? loadConfig().serverUrl
  try {
    const res = await fetch(`${target}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

// ─── Typed endpoints ───────────────────────────────────────────────────────

export interface Tool {
  id: string
  name: string
  provider: string
  description?: string
}

export interface Connection {
  provider: string
  connectedAt?: string
}

export interface ApiKey {
  keyPrefix: string
  name: string
  createdAt?: string
  revokedAt?: string | null
}

export const endpoints = {
  login: (email: string, password: string) =>
    api<{ apiKey: string; user: { email: string } }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      requireAuth: false,
    }),
  tools: () => api<{ tools: Tool[] } | Tool[]>('/api/tools', { requireAuth: false }),
  connections: () => api<{ connections: Connection[] } | Connection[]>('/api/tools/connected'),
  connectUrl: (provider: string) => api<{ url: string }>(`/api/auth/connect-url/${provider}`),
  disconnect: (provider: string) =>
    api<{ ok: true }>(`/api/auth/revoke/${provider}`, { method: 'DELETE' }),
  execute: (toolId: string, args: Record<string, unknown>) =>
    api<{ result: unknown } | unknown>('/api/tools/execute', {
      method: 'POST',
      body: { toolId, args },
      timeoutMs: 60000,
    }),
  keys: () => api<{ keys: ApiKey[] } | ApiKey[]>('/api/keys'),
}

export function unwrapTools(r: { tools: Tool[] } | Tool[]): Tool[] {
  return Array.isArray(r) ? r : r.tools
}
export function unwrapConnections(r: { connections: Connection[] } | Connection[]): Connection[] {
  return Array.isArray(r) ? r : r.connections
}
export function unwrapKeys(r: { keys: ApiKey[] } | ApiKey[]): ApiKey[] {
  return Array.isArray(r) ? r : r.keys
}
