import { safeToolError } from '../utils'
import { defineTool, z } from '@opentool/tool-schema'

const LINEAR_API = 'https://api.linear.app/graphql'

async function linearQuery(token: string, query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  const data = await res.json() as { data?: unknown; errors?: Array<{ message: string }> }

  if (data.errors?.length) {
    throw safeToolError(data.errors[0], 'Linear', 'execute')
  }

  return data.data
}

export const linearCreateIssue = defineTool({
  id: 'linear_create_issue',
  name: 'Create Linear Issue',
  description: 'Creates a new issue in Linear',
  provider: 'linear',
  authType: 'oauth2',
  requiredScopes: ['write'],
  inputSchema: z.object({
    teamId: z.string().describe('The ID of the team to create the issue in'),
    title: z.string().describe('Issue title'),
    description: z.string().optional().describe('Issue description (Markdown supported)'),
    priority: z.number().int().min(0).max(4).optional().describe('Priority (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)'),
    assigneeId: z.string().optional().describe('User ID to assign the issue to'),
    labelIds: z.array(z.string()).optional().describe('Label IDs to apply'),
  }),
  execute: async ({ input, auth }) => {
    const mutation = `
      mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            url
            priority
            state { name }
          }
        }
      }
    `

    const variables: Record<string, unknown> = {
      input: {
        teamId: input.teamId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        assigneeId: input.assigneeId,
        labelIds: input.labelIds,
      },
    }

    const data = await linearQuery(auth.accessToken!, mutation, variables) as {
      issueCreate: {
        success: boolean
        issue: {
          id: string
          identifier: string
          title: string
          url: string
          priority: number
          state: { name: string }
        }
      }
    }

    return {
      id: data.issueCreate.issue.id,
      identifier: data.issueCreate.issue.identifier,
      title: data.issueCreate.issue.title,
      url: data.issueCreate.issue.url,
      priority: data.issueCreate.issue.priority,
      status: data.issueCreate.issue.state.name,
    }
  },
})

export const linearUpdateIssueStatus = defineTool({
  id: 'linear_update_status',
  name: 'Update Linear Issue Status',
  description: 'Updates the status/state of an existing Linear issue',
  provider: 'linear',
  authType: 'oauth2',
  requiredScopes: ['write'],
  inputSchema: z.object({
    issueId: z.string().describe('The ID of the issue to update'),
    stateId: z.string().describe('The ID of the workflow state to transition to'),
    priority: z.number().int().min(0).max(4).optional().describe('New priority (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)'),
    assigneeId: z.string().optional().describe('New assignee user ID'),
  }),
  execute: async ({ input, auth }) => {
    const mutation = `
      mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            title
            url
            state { name }
            priority
          }
        }
      }
    `

    const updateInput: Record<string, unknown> = { stateId: input.stateId }
    if (input.priority !== undefined) updateInput.priority = input.priority
    if (input.assigneeId) updateInput.assigneeId = input.assigneeId

    const data = await linearQuery(auth.accessToken!, mutation, {
      id: input.issueId,
      input: updateInput,
    }) as {
      issueUpdate: {
        success: boolean
        issue: {
          id: string
          identifier: string
          title: string
          url: string
          state: { name: string }
          priority: number
        }
      }
    }

    return {
      id: data.issueUpdate.issue.id,
      identifier: data.issueUpdate.issue.identifier,
      title: data.issueUpdate.issue.title,
      url: data.issueUpdate.issue.url,
      status: data.issueUpdate.issue.state.name,
      priority: data.issueUpdate.issue.priority,
    }
  },
})

export const linearTools = [linearCreateIssue, linearUpdateIssueStatus]
