import { defineTool, z } from '@opentool/tool-schema'

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
      throw new Error(`GitHub API error: ${error.message}`)
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
      throw new Error(`GitHub API error: ${error.message}`)
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

export const githubTools = [githubCreateIssue, githubListIssues]