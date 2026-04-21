import { defineTool, z } from '@opentool/tool-schema'
import { safeToolError } from '../utils'

const GITHUB_API_VERSION = '2022-11-28'
const GITHUB_API_BASE_URL = 'https://api.github.com'

export const githubCreateIssue = defineTool({
  id: 'github_create_issue',
  name: 'Create GitHub Issue',
  description: 'Creates a new issue in a GitHub repository',
  provider: 'github',
  authType: 'oauth2',
  requiredScopes: ['repo'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    owner: z.string().describe('Repository owner (username or org)'),
    repo: z.string().describe('Repository name'),
    title: z.string().describe('Issue title'),
    body: z.string().optional().describe('Issue body/description'),
    labels: z.array(z.string()).optional().describe('Labels to apply'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetch(
      `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
        },
        body: JSON.stringify({
          title: input.title,
          body: input.body,
          labels: input.labels,
        }),
      },
    )

    if (!res.ok) {
      const error = (await res.json()) as { message: string }
      throw safeToolError(error, 'GitHub', 'execute')
    }

    const issue = (await res.json()) as {
      number: number
      html_url: string
      title: string
      state: string
    }

    return {
      id: issue.number,
      url: issue.html_url,
      title: issue.title,
      state: issue.state,
    }
  },
})

export const githubListIssues = defineTool({
  id: 'github_list_issues',
  name: 'List GitHub Issues',
  description:
    'Lists issues in a GitHub repository. Returns items with pagination metadata.\n\nReturns: { items: [{ id, title, state, url, createdAt }], count, limit, has_more }\n\nExamples:\n  - List open bugs: state="open"\n  - Recent 5 issues: limit=5',
  provider: 'github',
  authType: 'oauth2',
  requiredScopes: ['repo'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    state: z.enum(['open', 'closed', 'all']).optional().describe('Issue state filter'),
    limit: z
      .number()
      .int()
      .positive()
      .max(100)
      .optional()
      .describe('Max number of issues to return'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams({
      state: input.state ?? 'open',
      per_page: String(input.limit ?? 20),
    })

    const res = await fetch(
      `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues?${params}`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
        },
      },
    )

    if (!res.ok) {
      const error = (await res.json()) as { message: string }
      throw safeToolError(error, 'GitHub', 'execute')
    }

    const issues = (await res.json()) as Array<{
      number: number
      title: string
      state: string
      html_url: string
      created_at: string
    }>

    const limit = input.limit ?? 20
    return {
      items: issues.map((issue) => ({
        id: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        createdAt: issue.created_at,
      })),
      count: issues.length,
      limit,
      has_more: issues.length >= limit,
    }
  },
})

export const githubCreatePR = defineTool({
  id: 'github_create_pr',
  name: 'Create GitHub Pull Request',
  description: 'Creates a new pull request in a GitHub repository',
  provider: 'github',
  authType: 'oauth2',
  requiredScopes: ['repo'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    owner: z.string().describe('Repository owner (username or org)'),
    repo: z.string().describe('Repository name'),
    title: z.string().describe('Pull request title'),
    body: z.string().optional().describe('Pull request description'),
    head: z.string().describe('Branch containing changes (e.g. "feature-branch")'),
    base: z.string().describe('Branch to merge into (e.g. "main")'),
    draft: z.boolean().optional().describe('Whether to create as draft PR'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetch(
      `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
        },
        body: JSON.stringify({
          title: input.title,
          body: input.body,
          head: input.head,
          base: input.base,
          draft: input.draft ?? false,
        }),
      },
    )

    if (!res.ok) {
      const error = (await res.json()) as { message: string }
      throw safeToolError(error, 'GitHub', 'execute')
    }

    const pr = (await res.json()) as {
      number: number
      html_url: string
      title: string
      state: string
      draft: boolean
    }

    return {
      id: pr.number,
      url: pr.html_url,
      title: pr.title,
      state: pr.state,
      draft: pr.draft,
    }
  },
})

export const githubCommentOnIssue = defineTool({
  id: 'github_comment_on_issue',
  name: 'Comment on GitHub Issue',
  description: 'Adds a comment to an existing GitHub issue or pull request',
  provider: 'github',
  authType: 'oauth2',
  requiredScopes: ['repo'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    issue_number: z.number().int().positive().describe('Issue or pull request number'),
    body: z.string().describe('Comment body (Markdown supported)'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetch(
      `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/${encodeURIComponent(String(input.issue_number))}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
        },
        body: JSON.stringify({ body: input.body }),
      },
    )

    if (!res.ok) {
      const error = (await res.json()) as { message: string }
      throw safeToolError(error, 'GitHub', 'execute')
    }

    const comment = (await res.json()) as {
      id: number
      html_url: string
      body: string
      created_at: string
    }

    return {
      id: comment.id,
      url: comment.html_url,
      body: comment.body,
      createdAt: comment.created_at,
    }
  },
})

export const githubGetRepo = defineTool({
  id: 'github_get_repo',
  name: 'Get GitHub Repository',
  description: 'Gets information about a GitHub repository',
  provider: 'github',
  authType: 'oauth2',
  requiredScopes: ['repo'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetch(
      `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
        },
      },
    )

    if (!res.ok) {
      const error = (await res.json()) as { message: string }
      throw safeToolError(error, 'GitHub', 'execute')
    }

    const repo = (await res.json()) as {
      full_name: string
      description: string | null
      html_url: string
      language: string | null
      stargazers_count: number
      forks_count: number
      open_issues_count: number
      default_branch: string
      private: boolean
    }

    return {
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
    }
  },
})

export const githubTools = [
  githubCreateIssue,
  githubListIssues,
  githubCreatePR,
  githubCommentOnIssue,
  githubGetRepo,
]
