const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

function authHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` }
}

export const api = {
  health: () => request<{ status: string; timestamp: string }>('/health'),

  auth: {
    signup: (email: string, password: string, name?: string) =>
      request<{ user: User; apiKey: string }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),
    login: (email: string, password: string) =>
      request<{ user: User; apiKey: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },

  users: {
    me: (apiKey: string) =>
      request<User & { createdAt: string; connectedToolsCount: number }>('/api/users/me', {
        headers: authHeaders(apiKey),
      }),
    update: (apiKey: string, data: { name?: string; email?: string }) =>
      request<User>('/api/users/me', {
        method: 'PATCH',
        headers: authHeaders(apiKey),
        body: JSON.stringify(data),
      }),
  },

  tools: {
    list: () => request<{ count: number; tools: Tool[] }>('/api/tools'),
    connected: (apiKey: string) =>
      request<{ count: number; tools: Tool[] }>('/api/tools/connected', {
        headers: authHeaders(apiKey),
      }),
    connectUrl: (provider: string, apiKey: string) =>
      request<{ url?: string; authType?: string; provider?: string }>(`/api/auth/connect-url/${provider}`, {
        headers: authHeaders(apiKey),
      }),
    connectApiKey: (provider: string, apiKey: string, providerApiKey?: string) =>
      request<{ success: boolean; provider: string }>(`/api/auth/connect-api-key/${provider}`, {
        method: 'POST',
        headers: { ...authHeaders(apiKey), 'Content-Type': 'application/json' },
        body: providerApiKey ? JSON.stringify({ apiKey: providerApiKey }) : undefined,
      }),
    disconnect: (provider: string, apiKey: string) =>
      request<{ success: boolean }>('/api/auth/revoke/' + provider, {
        method: 'DELETE',
        headers: authHeaders(apiKey),
      }),
  },

  keys: {
    list: (apiKey: string) =>
      request<{ keys: ApiKey[] }>('/api/keys', {
        headers: authHeaders(apiKey),
      }),
    create: (apiKey: string, name: string) =>
      request<{ key: string; prefix: string; name: string }>('/api/keys', {
        method: 'POST',
        headers: authHeaders(apiKey),
        body: JSON.stringify({ name }),
      }),
    revoke: (apiKey: string, keyId: string) =>
      request<{ success: boolean }>(`/api/keys/${keyId}`, {
        method: 'DELETE',
        headers: authHeaders(apiKey),
      }),
  },
}

export interface User {
  id: string
  email: string
  name: string | null
}

export interface Tool {
  id: string
  name: string
  provider: string
  description: string
  authType: string
}

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
}
