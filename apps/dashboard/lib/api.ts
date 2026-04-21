const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Use BFF proxy for authenticated requests (API key stays in httpOnly cookie)
const PROXY_URL = '/api/proxy'

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

// Authenticated requests go through BFF proxy (auth injected server-side from httpOnly cookie)
async function authedRequest<T>(
  path: string,
  options: RequestInit = {},
  orgSlug?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (orgSlug) headers['X-Org-Slug'] = orgSlug
  const res = await fetch(`${PROXY_URL}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

// Public requests go directly to the API (no auth needed)
async function publicRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
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

export const api = {
  health: () => publicRequest<{ status: string; timestamp: string }>('/health'),

  auth: {
    signup: (email: string, password: string, name?: string) =>
      publicRequest<{ user: User; apiKey: string }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),
    login: (email: string, password: string) =>
      publicRequest<{ user: User; apiKey: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },

  users: {
    me: () =>
      authedRequest<User & { createdAt: string; connectedToolsCount: number }>('/api/users/me'),
    update: (data: { name?: string; email?: string }) =>
      authedRequest<User>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  tools: {
    list: () => publicRequest<{ count: number; tools: Tool[] }>('/api/tools'),
    connected: () => authedRequest<{ count: number; tools: Tool[] }>('/api/tools/connected'),
    connectUrl: (provider: string) =>
      authedRequest<{ url?: string; authType?: string; provider?: string }>(
        `/api/auth/connect-url/${provider}`,
      ),
    connectApiKey: (provider: string, providerApiKey?: string) =>
      authedRequest<{ success: boolean; provider: string }>(
        `/api/auth/connect-api-key/${provider}`,
        {
          method: 'POST',
          body: providerApiKey ? JSON.stringify({ apiKey: providerApiKey }) : undefined,
        },
      ),
    disconnect: (provider: string) =>
      authedRequest<{ success: boolean }>('/api/auth/revoke/' + provider, {
        method: 'DELETE',
      }),
  },

  keys: {
    list: () => authedRequest<{ keys: ApiKey[] }>('/api/keys'),
    create: (name: string) =>
      authedRequest<{ key: string; prefix: string; name: string }>('/api/keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    revoke: (keyId: string) =>
      authedRequest<{ success: boolean }>(`/api/keys/${keyId}`, {
        method: 'DELETE',
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
  list: () => authedRequest<{ orgs: (Org & { role: OrgRole })[] }>('/api/orgs'),

  get: (slug: string) => authedRequest<{ org: Org; role: OrgRole }>(`/api/orgs/${slug}`, {}, slug),

  create: (name: string, slug: string) =>
    authedRequest<{ org: Org }>('/api/orgs', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    }),

  update: (slug: string, data: { name?: string; plan?: string }) =>
    authedRequest<{ org: Org }>(
      `/api/orgs/${slug}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      slug,
    ),

  delete: (slug: string) =>
    authedRequest<{ success: boolean }>(`/api/orgs/${slug}`, { method: 'DELETE' }, slug),

  // Members
  members: (slug: string) =>
    authedRequest<{ members: OrgMember[] }>(`/api/orgs/${slug}/members`, {}, slug),

  invite: (slug: string, email: string, role: OrgRole) =>
    authedRequest<{ invite: OrgInvite }>(
      `/api/orgs/${slug}/members/invite`,
      {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      },
      slug,
    ),

  removeMember: (slug: string, userId: string) =>
    authedRequest<{ success: boolean }>(
      `/api/orgs/${slug}/members/${userId}`,
      { method: 'DELETE' },
      slug,
    ),

  changeRole: (slug: string, userId: string, role: OrgRole) =>
    authedRequest<{ success: boolean }>(
      `/api/orgs/${slug}/members/${userId}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      },
      slug,
    ),

  // Teams
  teams: (slug: string) => authedRequest<{ teams: OrgTeam[] }>(`/api/orgs/${slug}/teams`, {}, slug),

  createTeam: (slug: string, name: string, teamSlug: string, description?: string) =>
    authedRequest<{ team: OrgTeam }>(
      `/api/orgs/${slug}/teams`,
      {
        method: 'POST',
        body: JSON.stringify({ name, slug: teamSlug, description }),
      },
      slug,
    ),

  deleteTeam: (slug: string, teamSlug: string) =>
    authedRequest<{ success: boolean }>(
      `/api/orgs/${slug}/teams/${teamSlug}`,
      { method: 'DELETE' },
      slug,
    ),

  // API Keys
  orgKeys: (slug: string) =>
    authedRequest<{ keys: OrgApiKey[] }>(`/api/orgs/${slug}/keys`, {}, slug),

  createOrgKey: (slug: string, data: { name: string; scopes?: string[]; expiresInDays?: number }) =>
    authedRequest<{ key: string; prefix: string; name: string }>(
      `/api/orgs/${slug}/keys`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      slug,
    ),

  revokeOrgKey: (slug: string, keyId: string) =>
    authedRequest<{ success: boolean }>(
      `/api/orgs/${slug}/keys/${keyId}`,
      { method: 'DELETE' },
      slug,
    ),

  // Audit Log
  auditLog: (
    slug: string,
    params?: { page?: number; limit?: number; action?: string; userId?: string },
  ) =>
    authedRequest<{ entries: OrgAuditEntry[]; total: number; page: number; pages: number }>(
      `/api/orgs/${slug}/audit?${new URLSearchParams(
        Object.entries(params || {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString()}`,
      {},
      slug,
    ),

  // SSO
  configureSso: (slug: string, data: { provider: string; config: Record<string, any> }) =>
    authedRequest<{ success: boolean }>(
      `/api/orgs/${slug}/sso/configure`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      slug,
    ),

  testSso: (slug: string) =>
    authedRequest<{ success: boolean; error?: string }>(
      `/api/orgs/${slug}/sso/test`,
      { method: 'POST' },
      slug,
    ),

  disableSso: (slug: string) =>
    authedRequest<{ success: boolean }>(
      `/api/orgs/${slug}/sso/disable`,
      { method: 'DELETE' },
      slug,
    ),

  // Usage
  getUsage: (slug: string) =>
    authedRequest<{
      members: { current: number; limit: number }
      keys: { current: number; limit: number }
      toolExecs: { current: number; limit: number }
      apiCalls: { current: number; limit: number }
    }>(`/api/orgs/${slug}/usage`, {}, slug),

  // GDPR
  exportData: (slug: string) =>
    authedRequest<Record<string, any>>(`/api/orgs/${slug}/data/export`, { method: 'POST' }, slug),

  eraseData: (slug: string, confirmEmail: string) =>
    authedRequest<{ success: boolean }>(
      `/api/orgs/${slug}/data/erase`,
      {
        method: 'DELETE',
        body: JSON.stringify({ confirm: confirmEmail }),
      },
      slug,
    ),
}
