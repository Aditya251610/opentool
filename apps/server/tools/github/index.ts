import { defineTool, z } from '@opentool/tool-schema'
import { safeToolError } from '../utils'

export const githubCreateIssue = defineTool({
  id: 'github.create_issue',
  name: 'Create GitHub Issue',
  description: 'Creates a new issue in a GitHub repository',
  provider: 'github',
  authType: 'oauth2',
  requiredScopes: ['repo'],
  inputSchema: z.object({
    owner: z.string().describe('Repository owner (username or org)'),
    repo: z.string().describe('Repository name'),
    title: z.string().describe('Issue title'),
    body: z.string().optional().describe('Issue body/description'),
    labels: z.array(z.string()).optional().describe('Labels to apply'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetch(
      `https://api.github.com/repos/${input.owner}/${input.repo}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title: input.title,
          body: input.body,
          labels: input.labels,
        }),
      }
    )

    if (!res.ok) {
      const error = await res.json() as { message: string }
      throw safeToolError(error, 'GitHub', 'execute')
    }

    const issue = await res.json() as {
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
  id: 'github.list_issues',
  name: 'List GitHub Issues',
  description: 'Lists issues in a GitHub repository',
  provider: 'github',
  authType: 'oauth2',
  requiredScopes: ['repo'],
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    state: z.enum(['open', 'closed', 'all']).optional().describe('Issue state filter'),
    limit: z.number().optional().describe('Max number of issues to return'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams({
      state: input.state ?? 'open',
      per_page: String(input.limit ?? 20),
    })

    const res = await fetch(
      `https://api.github.com/repos/${input.owner}/${input.repo}/issues?${params}`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    )

    if (!res.ok) {
      const error = await res.json() as { message: string }
      throw safeToolError(error, 'GitHub', 'execute')
    }

    const issues = await res.json() as Array<{
      number: number
      title: string
      state: string
      html_url: string
      created_at: string
    }>

    return issues.map((issue) => ({
      id: issue.number,
      title: issue.title,
      state: issue.state,
      url: issue.html_url,
      createdAt: issue.created_at,
    }))
  },
})

export const githubCreatePR = defineTool({
  id: 'github.create_pr',
  name: 'Create GitHub Pull Request',
  description: 'Creates a new pull request in a GitHub repository',
  provider: 'github',
  authType: 'oauth2',
  requiredScopes: ['repo'],
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
      `https://api.github.com/repos/${input.owner}/${input.repo}/pulls`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title: input.title,
          body: input.body,
          head: input.head,
          base: input.base,
          draft: input.draft ?? false,
        }),
      }
    )

    if (!res.ok) {
      const error = await res.json() as { message: string }
      throw safeToolError(error, 'GitHub', 'execute')
    }

    const pr = await res.json() as {
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
  id: 'github.comment_on_issue',
  name: 'Comment on GitHub Issue',
  description: 'Adds a comment to an existing GitHub issue or pull request',
  provider: 'github',
  authType: 'oauth2',
  requiredScopes: ['repo'],
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    issue_number: z.number().describe('Issue or pull request number'),
    body: z.string().describe('Comment body (Markdown supported)'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetch(
      `https://api.github.com/repos/${input.owner}/${input.repo}/issues/${input.issue_number}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ body: input.body }),
      }
    )

    if (!res.ok) {
      const error = await res.json() as { message: string }
      throw safeToolError(error, 'GitHub', 'execute')
    }

    const comment = await res.json() as {
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
  id: 'github.get_repo',
  name: 'Get GitHub Repository',
  description: 'Gets information about a GitHub repository',
  provider: 'github',
  authType: 'oauth2',
  requiredScopes: ['repo'],
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetch(
      `https://api.github.com/repos/${input.owner}/${input.repo}`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    )

    if (!res.ok) {
      const error = await res.json() as { message: string }
      throw safeToolError(error, 'GitHub', 'execute')
    }

    const repo = await res.json() as {
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