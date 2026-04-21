const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Feature flags
export const FEATURES = {
  ORGS_ENABLED: process.env.NEXT_PUBLIC_ENABLE_ORGS !== 'false',
  SSO_ENABLED: process.env.NEXT_PUBLIC_ENABLE_SSO === 'true',
}

export function getServerUrl(): string {
  return API_URL.replace(/\/$/, '')
}

export function getServerHost(): string {
  try {
    const url = new URL(API_URL)
    return url.host
  } catch {
    return API_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

async function request<T>(path: string, options: RequestInit = {}, orgSlug?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (orgSlug) headers['X-Org-Slug'] = orgSlug
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
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
      request<{ url?: string; authType?: string; provider?: string }>(
        `/api/auth/connect-url/${provider}`,
        {
          headers: authHeaders(apiKey),
        },
      ),
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

// ─── Organization Types ──────────────────────────────────────────────────────

export interface Org {
  id: string
  name: string
  slug: string
  plan: string
  memberCount?: number
  createdAt?: string
}

export interface OrgMembership {
  orgId: string
  org: Org
  role: OrgRole
}

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export interface OrgMember {
  userId: string
  email: string
  name: string | null
  role: OrgRole
  joinedAt: string
}

export interface OrgTeam {
  id: string
  name: string
  slug: string
  description: string | null
  memberCount: number
}

export interface OrgInvite {
  id: string
  email: string
  role: OrgRole
  status: string
  invitedBy: string
  createdAt: string
  expiresAt: string
}

export interface OrgApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  environment: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

export interface OrgAuditEntry {
  id: string
  action: string
  userId: string
  targetId: string | null
  targetType: string | null
  inputSnapshot: Record<string, unknown> | null
  status: string
  createdAt: string
}

// ─── Organization API ────────────────────────────────────────────────────────

export const orgApi = {
  list: (apiKey: string) =>
    request<{ orgs: (Org & { role: OrgRole })[] }>('/api/orgs', {
      headers: authHeaders(apiKey),
    }),

  get: (apiKey: string, slug: string) =>
    request<{ org: Org; role: OrgRole }>(
      `/api/orgs/${slug}`,
      {
        headers: authHeaders(apiKey),
      },
      slug,
    ),

  create: (apiKey: string, name: string, slug: string) =>
    request<{ org: Org }>('/api/orgs', {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify({ name, slug }),
    }),

  update: (apiKey: string, slug: string, data: { name?: string; plan?: string }) =>
    request<{ org: Org }>(
      `/api/orgs/${slug}`,
      {
        method: 'PATCH',
        headers: authHeaders(apiKey),
        body: JSON.stringify(data),
      },
      slug,
    ),

  delete: (apiKey: string, slug: string) =>
    request<{ success: boolean }>(
      `/api/orgs/${slug}`,
      {
        method: 'DELETE',
        headers: authHeaders(apiKey),
      },
      slug,
    ),

  // Members
  members: (apiKey: string, slug: string) =>
    request<{ members: OrgMember[] }>(
      `/api/orgs/${slug}/members`,
      {
        headers: authHeaders(apiKey),
      },
      slug,
    ),

  invite: (apiKey: string, slug: string, email: string, role: OrgRole) =>
    request<{ invite: OrgInvite }>(
      `/api/orgs/${slug}/members/invite`,
      {
        method: 'POST',
        headers: authHeaders(apiKey),
        body: JSON.stringify({ email, role }),
      },
      slug,
    ),

  removeMember: (apiKey: string, slug: string, userId: string) =>
    request<{ success: boolean }>(
      `/api/orgs/${slug}/members/${userId}`,
      {
        method: 'DELETE',
        headers: authHeaders(apiKey),
      },
      slug,
    ),

  changeRole: (apiKey: string, slug: string, userId: string, role: OrgRole) =>
    request<{ success: boolean }>(
      `/api/orgs/${slug}/members/${userId}/role`,
      {
        method: 'PATCH',
        headers: authHeaders(apiKey),
        body: JSON.stringify({ role }),
      },
      slug,
    ),

  // Teams
  teams: (apiKey: string, slug: string) =>
    request<{ teams: OrgTeam[] }>(
      `/api/orgs/${slug}/teams`,
      {
        headers: authHeaders(apiKey),
      },
      slug,
    ),

  createTeam: (
    apiKey: string,
    slug: string,
    name: string,
    teamSlug: string,
    description?: string,
  ) =>
    request<{ team: OrgTeam }>(
      `/api/orgs/${slug}/teams`,
      {
        method: 'POST',
        headers: authHeaders(apiKey),
        body: JSON.stringify({ name, slug: teamSlug, description }),
      },
      slug,
    ),

  deleteTeam: (apiKey: string, slug: string, teamSlug: string) =>
    request<{ success: boolean }>(
      `/api/orgs/${slug}/teams/${teamSlug}`,
      {
        method: 'DELETE',
        headers: authHeaders(apiKey),
      },
      slug,
    ),

  // API Keys
  orgKeys: (apiKey: string, slug: string) =>
    request<{ keys: OrgApiKey[] }>(
      `/api/orgs/${slug}/keys`,
      {
        headers: authHeaders(apiKey),
      },
      slug,
    ),

  createOrgKey: (
    apiKey: string,
    slug: string,
    data: { name: string; scopes?: string[]; expiresInDays?: number },
  ) =>
    request<{ key: string; prefix: string; name: string }>(
      `/api/orgs/${slug}/keys`,
      {
        method: 'POST',
        headers: authHeaders(apiKey),
        body: JSON.stringify(data),
      },
      slug,
    ),

  revokeOrgKey: (apiKey: string, slug: string, keyId: string) =>
    request<{ success: boolean }>(
      `/api/orgs/${slug}/keys/${keyId}`,
      {
        method: 'DELETE',
        headers: authHeaders(apiKey),
      },
      slug,
    ),

  // Audit Log
  auditLog: (
    apiKey: string,
    slug: string,
    params?: { page?: number; limit?: number; action?: string; userId?: string },
  ) =>
    request<{ entries: OrgAuditEntry[]; total: number; page: number; pages: number }>(
      `/api/orgs/${slug}/audit?${new URLSearchParams(
        Object.entries(params || {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString()}`,
      { headers: authHeaders(apiKey) },
      slug,
    ),

  // SSO
  configureSso: (slug: string, data: { provider: string; config: Record<string, any> }) =>
    request<{ success: boolean }>(
      `/api/orgs/${slug}/sso/configure`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      slug,
    ),

  testSso: (slug: string) =>
    request<{ success: boolean; error?: string }>(
      `/api/orgs/${slug}/sso/test`,
      {
        method: 'POST',
      },
      slug,
    ),

  disableSso: (slug: string) =>
    request<{ success: boolean }>(
      `/api/orgs/${slug}/sso/disable`,
      {
        method: 'DELETE',
      },
      slug,
    ),

  // Usage
  getUsage: (slug: string) =>
    request<{
      members: { current: number; limit: number }
      keys: { current: number; limit: number }
      toolExecs: { current: number; limit: number }
      apiCalls: { current: number; limit: number }
    }>(`/api/orgs/${slug}/usage`, {}, slug),

  // GDPR
  exportData: (slug: string) =>
    request<Record<string, any>>(
      `/api/orgs/${slug}/data/export`,
      {
        method: 'POST',
      },
      slug,
    ),

  eraseData: (slug: string, confirmEmail: string) =>
    request<{ success: boolean }>(
      `/api/orgs/${slug}/data/erase`,
      {
        method: 'DELETE',
        body: JSON.stringify({ confirm: confirmEmail }),
      },
      slug,
    ),
}
