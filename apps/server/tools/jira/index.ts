import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

// ─── Helpers ──────────────────────────────

const ATLASSIAN_RESOURCES_URL = 'https://api.atlassian.com/oauth/token/accessible-resources'

let cachedCloudId: string | null = null

async function getCloudId(token: string): Promise<string> {
  if (cachedCloudId) return cachedCloudId

  const res = await fetchWithRetry(
    ATLASSIAN_RESOURCES_URL,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
    'Jira',
    'get_cloud_id',
  )

  const sites = (await res.json()) as { id: string; name: string; url: string }[]
  if (!sites.length) {
    throw new Error('No Atlassian sites found. Ensure the OAuth app has site access.')
  }

  cachedCloudId = sites[0].id
  return cachedCloudId
}

function jiraApiBase(cloudId: string): string {
  return `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`
}

function jiraHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

// ─── 1. List Projects ────────────────────

export const jiraListProjects = defineTool({
  id: 'jira_list_projects',
  name: 'List Jira Projects',
  description:
    'Lists projects in the Jira site accessible to the authenticated user.\n\nReturns: [{ key, name, id, projectTypeKey }]',
  provider: 'jira',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['read:jira-work'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of projects to return (1-50, default 20)'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Jira account first')
    const token = auth.accessToken

    const cloudId = await getCloudId(token)
    const base = jiraApiBase(cloudId)
    const maxResults = input.limit ?? 20

    const res = await fetchWithRetry(
      `${base}/project/search?maxResults=${maxResults}`,
      { headers: jiraHeaders(token) },
      'Jira',
      'list_projects',
    )

    const data = (await res.json()) as {
      values: {
        key: string
        name: string
        id: string
        projectTypeKey: string
      }[]
    }

    return data.values.map((p) => ({
      key: p.key,
      name: p.name,
      id: p.id,
      projectTypeKey: p.projectTypeKey,
    }))
  },
})

// ─── 2. Search Issues (JQL) ─────────────

export const jiraSearchIssues = defineTool({
  id: 'jira_search_issues',
  name: 'Search Jira Issues',
  description:
    'Searches Jira issues using JQL (Jira Query Language).\n\nReturns: { issues: [{ key, summary, status, assignee, priority, issueType, created, updated }], total, startAt, maxResults }',
  provider: 'jira',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['read:jira-work'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    jql: z.string().describe('JQL query e.g. "project = PROJ AND status = Open"'),
    max_results: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum results to return (1-50, default 20)'),
    start_at: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Index of the first result to return (for pagination)'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Jira account first')
    const token = auth.accessToken

    const cloudId = await getCloudId(token)
    const base = jiraApiBase(cloudId)

    const res = await fetchWithRetry(
      `${base}/search`,
      {
        method: 'POST',
        headers: jiraHeaders(token),
        body: JSON.stringify({
          jql: input.jql,
          maxResults: input.max_results ?? 20,
          startAt: input.start_at ?? 0,
          fields: ['summary', 'status', 'assignee', 'priority', 'issuetype', 'created', 'updated'],
        }),
      },
      'Jira',
      'search_issues',
    )

    const data = (await res.json()) as {
      issues: {
        key: string
        fields: {
          summary: string
          status: { name: string }
          assignee: { displayName: string; accountId: string } | null
          priority: { name: string } | null
          issuetype: { name: string }
          created: string
          updated: string
        }
      }[]
      total: number
      startAt: number
      maxResults: number
    }

    return {
      issues: data.issues.map((i) => ({
        key: i.key,
        summary: i.fields.summary,
        status: i.fields.status.name,
        assignee: i.fields.assignee?.displayName ?? null,
        priority: i.fields.priority?.name ?? null,
        issueType: i.fields.issuetype.name,
        created: i.fields.created,
        updated: i.fields.updated,
      })),
      total: data.total,
      startAt: data.startAt,
      maxResults: data.maxResults,
    }
  },
})

// ─── 3. Get Issue ────────────────────────

export const jiraGetIssue = defineTool({
  id: 'jira_get_issue',
  name: 'Get Jira Issue',
  description:
    'Gets detailed information about a single Jira issue including description, comments, and labels.\n\nReturns: { key, summary, status, assignee, reporter, priority, issueType, description, labels, comments, created, updated }',
  provider: 'jira',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['read:jira-work'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    issue_key: z.string().describe('Issue key e.g. "PROJ-123"'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Jira account first')
    const token = auth.accessToken

    const cloudId = await getCloudId(token)
    const base = jiraApiBase(cloudId)
    const fields =
      'summary,status,assignee,priority,issuetype,description,comment,created,updated,labels,reporter'

    const res = await fetchWithRetry(
      `${base}/issue/${encodeURIComponent(input.issue_key)}?fields=${fields}`,
      { headers: jiraHeaders(token) },
      'Jira',
      'get_issue',
    )

    const issue = (await res.json()) as {
      key: string
      fields: {
        summary: string
        status: { name: string }
        assignee: { displayName: string; accountId: string } | null
        reporter: { displayName: string; accountId: string } | null
        priority: { name: string } | null
        issuetype: { name: string }
        description: unknown
        labels: string[]
        comment: {
          comments: {
            id: string
            body: unknown
            author: { displayName: string }
            created: string
          }[]
        }
        created: string
        updated: string
      }
    }

    return {
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      assignee: issue.fields.assignee?.displayName ?? null,
      reporter: issue.fields.reporter?.displayName ?? null,
      priority: issue.fields.priority?.name ?? null,
      issueType: issue.fields.issuetype.name,
      description: issue.fields.description,
      labels: issue.fields.labels,
      comments: issue.fields.comment.comments.map((c) => ({
        id: c.id,
        body: c.body,
        author: c.author.displayName,
        created: c.created,
      })),
      created: issue.fields.created,
      updated: issue.fields.updated,
    }
  },
})

// ─── 4. Create Issue ─────────────────────

export const jiraCreateIssue = defineTool({
  id: 'jira_create_issue',
  name: 'Create Jira Issue',
  description:
    'Creates a Jira issue via the v3 REST API. Plain text descriptions are auto-converted to Atlassian Document Format (ADF). Requires write:jira-work scope.\n\nReturns: { id, key, self }\n\nExamples:\n  - Task: project_key="PROJ", summary="Fix login"\n  - Bug with priority: project_key="PROJ", summary="Crash on iOS", issue_type="Bug", priority="High"',
  provider: 'jira',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['write:jira-work'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_key: z.string().describe('Project key e.g. "PROJ"'),
    summary: z.string().describe('Issue title/summary'),
    issue_type: z
      .string()
      .optional()
      .describe('Issue type name (default "Task"). Common: Task, Bug, Story, Epic'),
    description: z
      .string()
      .optional()
      .describe('Plain text description (will be converted to ADF)'),
    priority: z.string().optional().describe('Priority name e.g. "High", "Medium", "Low"'),
    assignee_id: z.string().optional().describe('Atlassian account ID of the assignee'),
    labels: z.array(z.string()).optional().describe('Labels to apply to the issue'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Jira account first')
    const token = auth.accessToken

    const cloudId = await getCloudId(token)
    const base = jiraApiBase(cloudId)

    const fields: Record<string, unknown> = {
      project: { key: input.project_key },
      summary: input.summary,
      issuetype: { name: input.issue_type ?? 'Task' },
    }

    if (input.description) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: input.description }],
          },
        ],
      }
    }
    if (input.priority) fields.priority = { name: input.priority }
    if (input.assignee_id) fields.assignee = { accountId: input.assignee_id }
    if (input.labels) fields.labels = input.labels

    const res = await fetchWithRetry(
      `${base}/issue`,
      {
        method: 'POST',
        headers: jiraHeaders(token),
        body: JSON.stringify({ fields }),
      },
      'Jira',
      'create_issue',
    )

    const created = (await res.json()) as {
      id: string
      key: string
      self: string
    }

    return {
      id: created.id,
      key: created.key,
      self: created.self,
    }
  },
})

// ─── 5. Update Issue ─────────────────────

export const jiraUpdateIssue = defineTool({
  id: 'jira_update_issue',
  name: 'Update Jira Issue',
  description:
    'Updates an existing Jira issue. Only provided fields are changed; omitted fields are untouched. Idempotent. Requires write:jira-work scope.\n\nReturns: { updated: true, key }',
  provider: 'jira',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['write:jira-work'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    issue_key: z.string().describe('Issue key e.g. "PROJ-123"'),
    summary: z.string().optional().describe('New issue summary'),
    description: z
      .string()
      .optional()
      .describe('New plain text description (will be converted to ADF)'),
    priority: z.string().optional().describe('New priority name e.g. "High", "Medium", "Low"'),
    assignee_id: z.string().optional().describe('New assignee Atlassian account ID'),
    labels: z.array(z.string()).optional().describe('Replace all labels with this list'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Jira account first')
    const token = auth.accessToken

    const cloudId = await getCloudId(token)
    const base = jiraApiBase(cloudId)

    const fields: Record<string, unknown> = {}

    if (input.summary) fields.summary = input.summary
    if (input.description) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: input.description }],
          },
        ],
      }
    }
    if (input.priority) fields.priority = { name: input.priority }
    if (input.assignee_id) fields.assignee = { accountId: input.assignee_id }
    if (input.labels) fields.labels = input.labels

    await fetchWithRetry(
      `${base}/issue/${encodeURIComponent(input.issue_key)}`,
      {
        method: 'PUT',
        headers: jiraHeaders(token),
        body: JSON.stringify({ fields }),
      },
      'Jira',
      'update_issue',
    )

    return { updated: true, key: input.issue_key }
  },
})

// ─── 6. Add Comment ──────────────────────

export const jiraAddComment = defineTool({
  id: 'jira_add_comment',
  name: 'Add Jira Comment',
  description:
    'Adds a comment to a Jira issue. Plain text is auto-converted to ADF. Requires write:jira-work scope.\n\nReturns: { id, author, created }',
  provider: 'jira',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['write:jira-work'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    issue_key: z.string().describe('Issue key e.g. "PROJ-123"'),
    comment: z.string().describe('Comment text to add'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Jira account first')
    const token = auth.accessToken

    const cloudId = await getCloudId(token)
    const base = jiraApiBase(cloudId)

    const body = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: input.comment }],
          },
        ],
      },
    }

    const res = await fetchWithRetry(
      `${base}/issue/${encodeURIComponent(input.issue_key)}/comment`,
      {
        method: 'POST',
        headers: jiraHeaders(token),
        body: JSON.stringify(body),
      },
      'Jira',
      'add_comment',
    )

    const created = (await res.json()) as {
      id: string
      created: string
      author: { displayName: string }
    }

    return {
      id: created.id,
      author: created.author.displayName,
      created: created.created,
    }
  },
})

// ─── 7. List Transitions ────────────────

export const jiraListTransitions = defineTool({
  id: 'jira_list_transitions',
  name: 'List Jira Transitions',
  description:
    'Lists available workflow transitions for a Jira issue. Use this to discover valid status changes before transitioning an issue.\n\nReturns: [{ id, name, to: { name, id } }]',
  provider: 'jira',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['read:jira-work'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    issue_key: z.string().describe('Issue key e.g. "PROJ-123"'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Jira account first')
    const token = auth.accessToken

    const cloudId = await getCloudId(token)
    const base = jiraApiBase(cloudId)

    const res = await fetchWithRetry(
      `${base}/issue/${encodeURIComponent(input.issue_key)}/transitions`,
      { headers: jiraHeaders(token) },
      'Jira',
      'list_transitions',
    )

    const data = (await res.json()) as {
      transitions: {
        id: string
        name: string
        to: { name: string; id: string }
      }[]
    }

    return data.transitions.map((t) => ({
      id: t.id,
      name: t.name,
      to: { name: t.to.name, id: t.to.id },
    }))
  },
})

// ─── Export ──────────────────────────────

export const jiraTools = [
  jiraListProjects,
  jiraSearchIssues,
  jiraGetIssue,
  jiraCreateIssue,
  jiraUpdateIssue,
  jiraAddComment,
  jiraListTransitions,
]
