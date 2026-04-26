import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

const GITLAB_DEFAULT_BASE = 'https://gitlab.com/api/v4'

function getBase(): string {
  return process.env.GITLAB_BASE_URL
    ? `${process.env.GITLAB_BASE_URL.replace(/\/+$/, '')}/api/v4`
    : GITLAB_DEFAULT_BASE
}

function glHeaders(token: string) {
  return {
    'PRIVATE-TOKEN': token,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

// ─── 1. Create Issue ──────────────────────

export const gitlabCreateIssue = defineTool({
  id: 'gitlab_create_issue',
  name: 'Create GitLab Issue',
  description:
    'Creates a GitLab issue via POST /projects/{id}/issues. Requires api OAuth scope.\n\nReturns: { iid, url, title, state }\n\nExamples:\n  - Simple issue: project_id="123", title="Bug in auth"\n  - With labels: project_id="group%2Frepo", title="Fix CI", labels=["bug","urgent"]',
  provider: 'gitlab',
  authType: 'oauth2',
  requiredScopes: ['api'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_id: z
      .string()
      .describe('Project ID or URL-encoded path (e.g. "123" or "group%2Fproject")'),
    title: z.string().describe('Issue title'),
    description: z.string().optional().describe('Issue description (Markdown)'),
    labels: z.array(z.string()).optional().describe('Label names to apply'),
    assignee_ids: z.array(z.number()).optional().describe('User IDs to assign'),
    milestone_id: z.number().optional().describe('Milestone ID'),
    confidential: z.boolean().optional().describe('Mark as confidential'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${getBase()}/projects/${encodeURIComponent(input.project_id)}/issues`,
      {
        method: 'POST',
        headers: glHeaders(auth.accessToken!),
        body: JSON.stringify({
          title: input.title,
          description: input.description,
          labels: input.labels?.join(','),
          assignee_ids: input.assignee_ids,
          milestone_id: input.milestone_id,
          confidential: input.confidential,
        }),
      },
      'GitLab',
      'create_issue',
    )

    const issue = (await res.json()) as {
      iid: number
      web_url: string
      title: string
      state: string
    }

    return {
      iid: issue.iid,
      url: issue.web_url,
      title: issue.title,
      state: issue.state,
    }
  },
})

// ─── 2. Get Issue ─────────────────────────

export const gitlabGetIssue = defineTool({
  id: 'gitlab_get_issue',
  name: 'Get GitLab Issue',
  description:
    'Fetches a GitLab issue by project and internal ID. Requires read_api scope.\n\nReturns: { iid, title, description, state, author, assignees, labels, url, createdAt, updatedAt }',
  provider: 'gitlab',
  authType: 'oauth2',
  requiredScopes: ['read_api'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_id: z.string().describe('Project ID or URL-encoded path'),
    issue_iid: z.number().describe('Internal ID of the issue'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${getBase()}/projects/${encodeURIComponent(input.project_id)}/issues/${input.issue_iid}`,
      { headers: glHeaders(auth.accessToken!) },
      'GitLab',
      'get_issue',
    )

    const issue = (await res.json()) as {
      iid: number
      title: string
      description: string
      state: string
      author: { username: string }
      assignees: { username: string }[]
      labels: string[]
      web_url: string
      created_at: string
      updated_at: string
    }

    return {
      iid: issue.iid,
      title: issue.title,
      description: issue.description,
      state: issue.state,
      author: issue.author?.username,
      assignees: issue.assignees?.map((a) => a.username),
      labels: issue.labels,
      url: issue.web_url,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
    }
  },
})

// ─── 3. Create Merge Request ──────────────

export const gitlabCreateMergeRequest = defineTool({
  id: 'gitlab_create_merge_request',
  name: 'Create GitLab Merge Request',
  description:
    'Creates a merge request via POST /projects/{id}/merge_requests. Source branch must exist. Requires api scope.\n\nReturns: { iid, url, title, state }',
  provider: 'gitlab',
  authType: 'oauth2',
  requiredScopes: ['api'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_id: z.string().describe('Project ID or URL-encoded path'),
    title: z.string().describe('Merge request title'),
    source_branch: z.string().describe('Source branch name'),
    target_branch: z.string().describe('Target branch name'),
    description: z.string().optional().describe('MR description (Markdown)'),
    labels: z.array(z.string()).optional().describe('Label names'),
    assignee_ids: z.array(z.number()).optional().describe('Assignee user IDs'),
    reviewer_ids: z.array(z.number()).optional().describe('Reviewer user IDs'),
    milestone_id: z.number().optional().describe('Milestone ID'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${getBase()}/projects/${encodeURIComponent(input.project_id)}/merge_requests`,
      {
        method: 'POST',
        headers: glHeaders(auth.accessToken!),
        body: JSON.stringify({
          title: input.title,
          source_branch: input.source_branch,
          target_branch: input.target_branch,
          description: input.description,
          labels: input.labels?.join(','),
          assignee_ids: input.assignee_ids,
          reviewer_ids: input.reviewer_ids,
          milestone_id: input.milestone_id,
        }),
      },
      'GitLab',
      'create_merge_request',
    )

    const mr = (await res.json()) as {
      iid: number
      web_url: string
      title: string
      state: string
    }

    return {
      iid: mr.iid,
      url: mr.web_url,
      title: mr.title,
      state: mr.state,
    }
  },
})

// ─── 4. Get Merge Request ─────────────────

export const gitlabGetMergeRequest = defineTool({
  id: 'gitlab_get_merge_request',
  name: 'Get GitLab Merge Request',
  description:
    'Fetches merge request details including conflict status and reviewers. Requires read_api scope.\n\nReturns: { iid, title, description, state, sourceBranch, targetBranch, author, assignees, reviewers, labels, url, mergeStatus, hasConflicts, createdAt, updatedAt }',
  provider: 'gitlab',
  authType: 'oauth2',
  requiredScopes: ['read_api'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_id: z.string().describe('Project ID or URL-encoded path'),
    merge_request_iid: z.number().describe('Internal ID of the merge request'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${getBase()}/projects/${encodeURIComponent(input.project_id)}/merge_requests/${input.merge_request_iid}`,
      { headers: glHeaders(auth.accessToken!) },
      'GitLab',
      'get_merge_request',
    )

    const mr = (await res.json()) as {
      iid: number
      title: string
      description: string
      state: string
      source_branch: string
      target_branch: string
      author: { username: string }
      assignees: { username: string }[]
      reviewers: { username: string }[]
      labels: string[]
      web_url: string
      merge_status: string
      has_conflicts: boolean
      created_at: string
      updated_at: string
    }

    return {
      iid: mr.iid,
      title: mr.title,
      description: mr.description,
      state: mr.state,
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      author: mr.author?.username,
      assignees: mr.assignees?.map((a) => a.username),
      reviewers: mr.reviewers?.map((r) => r.username),
      labels: mr.labels,
      url: mr.web_url,
      mergeStatus: mr.merge_status,
      hasConflicts: mr.has_conflicts,
      createdAt: mr.created_at,
      updatedAt: mr.updated_at,
    }
  },
})

// ─── 5. List MR Commits ──────────────────

export const gitlabListMergeRequestCommits = defineTool({
  id: 'gitlab_list_merge_request_commits',
  name: 'List GitLab MR Commits',
  description:
    'Lists commits in a GitLab merge request with pagination. Requires read_api scope.\n\nReturns: [{ sha, fullSha, title, author, createdAt }]',
  provider: 'gitlab',
  authType: 'oauth2',
  requiredScopes: ['read_api'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_id: z.string().describe('Project ID or URL-encoded path'),
    merge_request_iid: z.number().describe('Internal ID of the merge request'),
    per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
    page: z.number().min(1).optional().describe('Page number'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams()
    if (input.per_page) params.set('per_page', String(input.per_page))
    if (input.page) params.set('page', String(input.page))

    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetchWithRetry(
      `${getBase()}/projects/${encodeURIComponent(input.project_id)}/merge_requests/${input.merge_request_iid}/commits${qs}`,
      { headers: glHeaders(auth.accessToken!) },
      'GitLab',
      'list_mr_commits',
    )

    const commits = (await res.json()) as {
      id: string
      short_id: string
      title: string
      author_name: string
      created_at: string
    }[]

    return commits.map((c) => ({
      sha: c.short_id,
      fullSha: c.id,
      title: c.title,
      author: c.author_name,
      createdAt: c.created_at,
    }))
  },
})

// ─── 6. List Pipelines ───────────────────

export const gitlabListPipelines = defineTool({
  id: 'gitlab_list_pipelines',
  name: 'List GitLab Pipelines',
  description:
    'Lists CI/CD pipelines for a project, optionally filtered by branch/tag and status. Requires read_api scope.\n\nReturns: [{ id, status, ref, sha, url, createdAt }]',
  provider: 'gitlab',
  authType: 'oauth2',
  requiredScopes: ['read_api'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_id: z.string().describe('Project ID or URL-encoded path'),
    ref: z.string().optional().describe('Branch or tag name to filter by'),
    status: z
      .enum(['running', 'pending', 'success', 'failed', 'canceled', 'skipped', 'manual'])
      .optional()
      .describe('Pipeline status filter'),
    per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
    page: z.number().min(1).optional().describe('Page number'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams()
    if (input.ref) params.set('ref', input.ref)
    if (input.status) params.set('status', input.status)
    if (input.per_page) params.set('per_page', String(input.per_page))
    if (input.page) params.set('page', String(input.page))

    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetchWithRetry(
      `${getBase()}/projects/${encodeURIComponent(input.project_id)}/pipelines${qs}`,
      { headers: glHeaders(auth.accessToken!) },
      'GitLab',
      'list_pipelines',
    )

    const pipelines = (await res.json()) as {
      id: number
      status: string
      ref: string
      sha: string
      web_url: string
      created_at: string
    }[]

    return pipelines.map((p) => ({
      id: p.id,
      status: p.status,
      ref: p.ref,
      sha: p.sha?.substring(0, 8),
      url: p.web_url,
      createdAt: p.created_at,
    }))
  },
})

// ─── 7. Get Pipeline Jobs ─────────────────

export const gitlabGetPipelineJobs = defineTool({
  id: 'gitlab_get_pipeline_jobs',
  name: 'Get GitLab Pipeline Jobs',
  description:
    'Lists jobs for a pipeline including stage, status, and duration. Requires read_api scope.\n\nReturns: [{ id, name, status, stage, url, durationSeconds, startedAt, finishedAt }]',
  provider: 'gitlab',
  authType: 'oauth2',
  requiredScopes: ['read_api'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_id: z.string().describe('Project ID or URL-encoded path'),
    pipeline_id: z.number().describe('Pipeline ID'),
    per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
    page: z.number().min(1).optional().describe('Page number'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams()
    if (input.per_page) params.set('per_page', String(input.per_page))
    if (input.page) params.set('page', String(input.page))

    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetchWithRetry(
      `${getBase()}/projects/${encodeURIComponent(input.project_id)}/pipelines/${input.pipeline_id}/jobs${qs}`,
      { headers: glHeaders(auth.accessToken!) },
      'GitLab',
      'get_pipeline_jobs',
    )

    const jobs = (await res.json()) as {
      id: number
      name: string
      status: string
      stage: string
      web_url: string
      duration: number | null
      started_at: string | null
      finished_at: string | null
    }[]

    return jobs.map((j) => ({
      id: j.id,
      name: j.name,
      status: j.status,
      stage: j.stage,
      url: j.web_url,
      durationSeconds: j.duration,
      startedAt: j.started_at,
      finishedAt: j.finished_at,
    }))
  },
})

// ─── 8. Search ────────────────────────────

export const gitlabSearch = defineTool({
  id: 'gitlab_search',
  name: 'Search GitLab',
  description:
    'Searches across a GitLab instance or within a project/group for issues, MRs, projects, milestones, or code blobs. Requires read_api scope.\n\nReturns: raw GitLab search results (schema varies by scope)',
  provider: 'gitlab',
  authType: 'oauth2',
  requiredScopes: ['read_api'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    scope: z
      .enum(['issues', 'merge_requests', 'projects', 'milestones', 'blobs'])
      .describe('Search scope'),
    search: z.string().max(200).describe('Search term'),
    project_id: z.string().optional().describe('Scope search to this project ID or path'),
    group_id: z.string().optional().describe('Scope search to this group ID or path'),
    state: z
      .enum(['opened', 'closed', 'merged', 'all'])
      .optional()
      .describe('State filter (issues/MRs)'),
    per_page: z.number().min(1).max(100).optional().describe('Results per page'),
    page: z.number().min(1).optional().describe('Page number'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams({
      scope: input.scope,
      search: input.search,
    })
    if (input.state) params.set('state', input.state)
    if (input.per_page) params.set('per_page', String(input.per_page))
    if (input.page) params.set('page', String(input.page))

    let url: string
    if (input.project_id) {
      url = `${getBase()}/projects/${encodeURIComponent(input.project_id)}/search?${params.toString()}`
    } else if (input.group_id) {
      url = `${getBase()}/groups/${encodeURIComponent(input.group_id)}/search?${params.toString()}`
    } else {
      url = `${getBase()}/search?${params.toString()}`
    }

    const res = await fetchWithRetry(
      url,
      { headers: glHeaders(auth.accessToken!) },
      'GitLab',
      'search',
    )
    return res.json()
  },
})

// ─── Export ───────────────────────────────

export const gitlabTools = [
  gitlabCreateIssue,
  gitlabGetIssue,
  gitlabCreateMergeRequest,
  gitlabGetMergeRequest,
  gitlabListMergeRequestCommits,
  gitlabListPipelines,
  gitlabGetPipelineJobs,
  gitlabSearch,
]
