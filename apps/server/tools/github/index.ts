import { defineTool, z } from '@opentool/tool-schema'
import { safeToolError } from '../utils'

const GITHUB_API_VERSION = '2022-11-28'
const GITHUB_API_BASE_URL = 'https://api.github.com'

export const githubCreateIssue = defineTool({
  id: 'github_create_issue',
  name: 'Create GitHub Issue',
  description:
    'Creates a GitHub issue via POST /repos/{owner}/{repo}/issues. Requires repo OAuth scope.\n\nReturns: { id, url, title, state }\n\nExamples:\n  - Bug report: owner="acme", repo="api", title="Login broken", labels=["bug"]\n  - Feature request: owner="acme", repo="api", title="Add SSO", body="We need SAML support"',
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
  description:
    'Creates a pull request via POST /repos/{owner}/{repo}/pulls. The head branch must already exist. Requires repo OAuth scope.\n\nReturns: { id, url, title, state, draft }\n\nExamples:\n  - Standard PR: owner="acme", repo="api", head="feature-x", base="main"\n  - Draft PR: owner="acme", repo="api", head="wip", base="main", draft=true',
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
  description:
    'Adds a comment to an issue or PR via POST /repos/{owner}/{repo}/issues/{number}/comments. Works for both issues and PRs (same endpoint). Requires repo OAuth scope.\n\nReturns: { id, url, body, createdAt }',
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
  description:
    'Fetches repository metadata via GET /repos/{owner}/{repo}. Requires repo OAuth scope.\n\nReturns: { fullName, description, url, language, stars, forks, openIssues, defaultBranch, isPrivate }',
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

export const githubSearchCode = defineTool({
  id: 'github_search_code',
  name: 'Search GitHub Code',
  description:
    'Search for code across GitHub repositories using GitHub code search syntax.\n\nReturns: { items: [{ path, repository, url, text_matches }], total_count, has_more }\n\nExamples:\n  - Find usage: query="useState language:typescript"\n  - In repo: query="repo:owner/repo handleAuth"',
  provider: 'github',
  authType: 'oauth2',
  category: 'development',
  requiredScopes: ['repo'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe('GitHub code search query (e.g. "handleAuth language:typescript repo:acme/api")'),
    limit: z.number().int().min(1).max(100).optional().describe('Max results (default 20)'),
    page: z.number().int().min(1).optional().describe('Page number for pagination'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams({
      q: input.query,
      per_page: String(input.limit ?? 20),
      page: String(input.page ?? 1),
    })
    const res = await fetch(`${GITHUB_API_BASE_URL}/search/code?${params}`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/vnd.github.text-match+json',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    })
    if (!res.ok) {
      const err = (await res.json()) as { message: string }
      throw new Error(`GitHub code search failed (HTTP ${res.status}): ${err.message}`)
    }
    const data = (await res.json()) as { total_count: number; items: any[] }
    const limit = input.limit ?? 20
    return {
      items: data.items.map((item: any) => ({
        path: item.path,
        repository: item.repository?.full_name,
        url: item.html_url,
        text_matches: item.text_matches?.map((tm: any) => tm.fragment).slice(0, 3),
      })),
      total_count: data.total_count,
      count: data.items.length,
      has_more: data.total_count > (input.page ?? 1) * limit,
    }
  },
})

export const githubGetPRDiff = defineTool({
  id: 'github_get_pr_diff',
  name: 'Get PR Diff',
  description:
    'Gets the diff of a GitHub pull request for code review. Returns the raw unified diff.\n\nReturns: { diff, files_changed, additions, deletions }\n\nExamples:\n  - Review PR: owner="acme", repo="api", pull_number=42',
  provider: 'github',
  authType: 'oauth2',
  category: 'development',
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
    pull_number: z.number().int().describe('Pull request number'),
  }),
  execute: async ({ input, auth }) => {
    const diffRes = await fetch(
      `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/vnd.github.diff',
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
        },
      },
    )
    if (!diffRes.ok) throw new Error(`GitHub get PR diff failed (HTTP ${diffRes.status})`)
    const diff = await diffRes.text()

    const prRes = await fetch(
      `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
        },
      },
    )
    const pr = prRes.ok
      ? ((await prRes.json()) as {
          changed_files: number
          additions: number
          deletions: number
          title: string
          state: string
        })
      : null

    return {
      title: pr?.title,
      state: pr?.state,
      diff:
        diff.length > 20000
          ? diff.substring(0, 20000) + '\n...diff truncated at 20000 chars'
          : diff,
      files_changed: pr?.changed_files,
      additions: pr?.additions,
      deletions: pr?.deletions,
    }
  },
})

export const githubTools = [
  githubCreateIssue,
  githubListIssues,
  githubCreatePR,
  githubCommentOnIssue,
  githubGetRepo,
  githubSearchCode,
  githubGetPRDiff,
]
