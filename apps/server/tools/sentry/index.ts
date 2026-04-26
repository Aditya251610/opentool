import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

const SENTRY_DEFAULT_BASE = 'https://sentry.io/api/0'

function getBase(): string {
  const host = process.env.SENTRY_BASE_URL
  if (host) return `${host.replace(/\/+$/, '')}/api/0`
  return SENTRY_DEFAULT_BASE
}

function sentryHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

// ─── 1. List Organizations ────────────────

export const sentryListOrganizations = defineTool({
  id: 'sentry_list_organizations',
  name: 'List Sentry Organizations',
  description:
    'Lists Sentry organizations accessible to the authenticated user via GET /organizations/. Supports self-hosted via SENTRY_BASE_URL env var.\n\nReturns: [{ slug, name, id }]',
  provider: 'sentry',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  execute: async ({ auth }) => {
    const res = await fetchWithRetry(
      `${getBase()}/organizations/`,
      { headers: sentryHeaders(auth.apiKey!) },
      'Sentry',
      'list_organizations',
    )

    const orgs = (await res.json()) as {
      slug: string
      name: string
      id: string
    }[]

    return orgs.map((o) => ({
      slug: o.slug,
      name: o.name,
      id: o.id,
    }))
  },
})

// ─── 2. List Projects ────────────────────

export const sentryListProjects = defineTool({
  id: 'sentry_list_projects',
  name: 'List Sentry Projects',
  description:
    'Lists projects in a Sentry organization via GET /organizations/{org}/projects/.\n\nReturns: [{ slug, name, id, platform, createdAt }]',
  provider: 'sentry',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    organization_slug: z.string().describe('Sentry organization slug'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${getBase()}/organizations/${encodeURIComponent(input.organization_slug)}/projects/`,
      { headers: sentryHeaders(auth.apiKey!) },
      'Sentry',
      'list_projects',
    )

    const projects = (await res.json()) as {
      slug: string
      name: string
      id: string
      platform: string | null
      dateCreated: string
    }[]

    return projects.map((p) => ({
      slug: p.slug,
      name: p.name,
      id: p.id,
      platform: p.platform,
      createdAt: p.dateCreated,
    }))
  },
})

// ─── 3. List Issues ──────────────────────

export const sentryListIssues = defineTool({
  id: 'sentry_list_issues',
  name: 'List Sentry Issues',
  description:
    'Lists error issues for a Sentry project with optional query filter and sort. Uses the Sentry search syntax.\n\nReturns: [{ id, shortId, title, culprit, level, status, eventCount, firstSeen, lastSeen, url }]\n\nExamples:\n  - Unresolved errors: query="is:unresolved level:error"\n  - Frequent issues: sort="freq"',
  provider: 'sentry',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    organization_slug: z.string().describe('Sentry organization slug'),
    project_slug: z.string().describe('Sentry project slug'),
    query: z.string().optional().describe('Search query (e.g. "is:unresolved level:error")'),
    sort: z
      .enum(['date', 'new', 'freq', 'priority'])
      .optional()
      .describe('Sort order (default: date)'),
    cursor: z.string().optional().describe('Pagination cursor from previous response'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams({
      project: input.project_slug,
    })
    if (input.query) params.set('query', input.query)
    if (input.sort) params.set('sort', input.sort)
    if (input.cursor) params.set('cursor', input.cursor)

    const res = await fetchWithRetry(
      `${getBase()}/projects/${encodeURIComponent(input.organization_slug)}/${encodeURIComponent(input.project_slug)}/issues/?${params.toString()}`,
      { headers: sentryHeaders(auth.apiKey!) },
      'Sentry',
      'list_issues',
    )

    const issues = (await res.json()) as {
      id: string
      shortId: string
      title: string
      culprit: string
      level: string
      status: string
      count: string
      firstSeen: string
      lastSeen: string
      permalink: string
    }[]

    return issues.map((i) => ({
      id: i.id,
      shortId: i.shortId,
      title: i.title,
      culprit: i.culprit,
      level: i.level,
      status: i.status,
      eventCount: i.count,
      firstSeen: i.firstSeen,
      lastSeen: i.lastSeen,
      url: i.permalink,
    }))
  },
})

// ─── 4. Get Issue ─────────────────────────

export const sentryGetIssue = defineTool({
  id: 'sentry_get_issue',
  name: 'Get Sentry Issue',
  description:
    'Retrieves detailed info about a Sentry issue including metadata and assignment. Accepts numeric ID or short ID (e.g. "PROJECT-123").\n\nReturns: { id, shortId, title, culprit, level, status, eventCount, firstSeen, lastSeen, url, project, assignedTo, metadata }',
  provider: 'sentry',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    issue_id: z.string().describe('Sentry issue ID (numeric) or short ID (e.g. "PROJECT-123")'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${getBase()}/issues/${encodeURIComponent(input.issue_id)}/`,
      { headers: sentryHeaders(auth.apiKey!) },
      'Sentry',
      'get_issue',
    )

    const issue = (await res.json()) as {
      id: string
      shortId: string
      title: string
      culprit: string
      level: string
      status: string
      count: string
      firstSeen: string
      lastSeen: string
      permalink: string
      metadata: Record<string, unknown>
      project: { slug: string; name: string }
      assignedTo: { name: string } | null
    }

    return {
      id: issue.id,
      shortId: issue.shortId,
      title: issue.title,
      culprit: issue.culprit,
      level: issue.level,
      status: issue.status,
      eventCount: issue.count,
      firstSeen: issue.firstSeen,
      lastSeen: issue.lastSeen,
      url: issue.permalink,
      project: issue.project?.slug,
      assignedTo: issue.assignedTo?.name ?? null,
      metadata: issue.metadata,
    }
  },
})

// ─── 5. Get Event ─────────────────────────

export const sentryGetEvent = defineTool({
  id: 'sentry_get_event',
  name: 'Get Sentry Event',
  description:
    'Retrieves a specific error event with stacktrace, tags, and context via GET /projects/{org}/{project}/events/{event_id}/.\n\nReturns: { eventId, title, message, createdAt, tags, entries, context }',
  provider: 'sentry',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    organization_slug: z.string().describe('Sentry organization slug'),
    project_slug: z.string().describe('Sentry project slug'),
    event_id: z.string().describe('Event ID'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${getBase()}/projects/${encodeURIComponent(input.organization_slug)}/${encodeURIComponent(input.project_slug)}/events/${encodeURIComponent(input.event_id)}/`,
      { headers: sentryHeaders(auth.apiKey!) },
      'Sentry',
      'get_event',
    )

    const event = (await res.json()) as {
      eventID: string
      title: string
      message: string
      dateCreated: string
      tags: { key: string; value: string }[]
      entries: unknown[]
      context: Record<string, unknown>
    }

    return {
      eventId: event.eventID,
      title: event.title,
      message: event.message,
      createdAt: event.dateCreated,
      tags: event.tags,
      entries: event.entries,
      context: event.context,
    }
  },
})

// ─── 6. Resolve Issue ─────────────────────

export const sentryResolveIssue = defineTool({
  id: 'sentry_resolve_issue',
  name: 'Resolve Sentry Issue',
  description:
    'Updates a Sentry issue status via PUT /issues/{id}/. Idempotent — setting the same status twice is a no-op.\n\nReturns: { id, shortId, status }\n\nExamples:\n  - Resolve: issue_id="12345", status="resolved"\n  - Ignore: issue_id="12345", status="ignored"',
  provider: 'sentry',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    issue_id: z.string().describe('Sentry issue ID'),
    status: z.enum(['resolved', 'unresolved', 'ignored']).describe('New status for the issue'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${getBase()}/issues/${encodeURIComponent(input.issue_id)}/`,
      {
        method: 'PUT',
        headers: sentryHeaders(auth.apiKey!),
        body: JSON.stringify({ status: input.status }),
      },
      'Sentry',
      'resolve_issue',
    )

    const issue = (await res.json()) as {
      id: string
      shortId: string
      status: string
    }

    return {
      id: issue.id,
      shortId: issue.shortId,
      status: issue.status,
    }
  },
})

// ─── 7. Search Issues ─────────────────────

export const sentrySearchIssues = defineTool({
  id: 'sentry_search_issues',
  name: 'Search Sentry Issues',
  description:
    'Search for error issues in Sentry using search syntax. Find bugs by error message, stack trace, or metadata.\n\nReturns: { issues: [{ id, title, culprit, count, firstSeen, lastSeen, status, permalink }], count }\n\nExamples:\n  - Find errors: org="myorg", project="api", query="TypeError"\n  - Unresolved: query="is:unresolved level:error"',
  provider: 'sentry',
  authType: 'api_key',
  category: 'development',
  requiredScopes: ['event:read'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    organization: z.string().describe('Sentry organization slug'),
    project: z.string().optional().describe('Project slug to scope search (optional)'),
    query: z.string().optional().describe('Sentry search query (e.g. "is:unresolved TypeError")'),
    limit: z.number().int().min(1).max(100).optional().describe('Max results (default 25)'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams()
    if (input.query) params.set('query', input.query)
    params.set('limit', String(input.limit ?? 25))
    if (input.project) params.set('project', input.project)

    const url = `${getBase()}/organizations/${encodeURIComponent(input.organization)}/issues/?${params}`
    const res = await fetchWithRetry(
      url,
      { headers: sentryHeaders(auth.apiKey!) },
      'Sentry',
      'search_issues',
    )

    const issues = (await res.json()) as Array<{
      id: string
      title: string
      culprit: string
      count: string
      firstSeen: string
      lastSeen: string
      status: string
      permalink: string
    }>
    return {
      issues: issues.map((i) => ({
        id: i.id,
        title: i.title,
        culprit: i.culprit,
        count: parseInt(i.count),
        firstSeen: i.firstSeen,
        lastSeen: i.lastSeen,
        status: i.status,
        permalink: i.permalink,
      })),
      count: issues.length,
    }
  },
})

// ─── Export ───────────────────────────────

export const sentryTools = [
  sentryListOrganizations,
  sentryListProjects,
  sentryListIssues,
  sentryGetIssue,
  sentryGetEvent,
  sentryResolveIssue,
  sentrySearchIssues,
]
