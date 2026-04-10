import { safeToolError } from '../utils'
import { defineTool, z } from '@opentool/tool-schema'

const VERCEL_BASE = 'https://api.vercel.com'

export const vercelListDeployments = defineTool({
  id: 'vercel_list_deployments',
  name: 'List Vercel Deployments',
  description: 'Lists deployments for a Vercel project',
  provider: 'vercel',
  authType: 'oauth2',
  requiredScopes: [],
  inputSchema: z.object({
    projectId: z.string().describe('Vercel project ID or slug'),
    teamId: z.string().optional().describe('Team ID or slug (required for team projects)'),
    limit: z.number().optional().describe('Number of deployments to return (default 10)'),
    target: z.enum(['production', 'preview']).optional().describe('Filter by deployment target'),
  }),
  execute: async ({ input, auth }) => {
    const teamId = input.teamId || (auth.metadata?.team_id as string | undefined)
    const params = new URLSearchParams({
      projectId: input.projectId,
      limit: String(input.limit ?? 10),
    })
    if (teamId) params.set('teamId', teamId)
    if (input.target) params.set('target', input.target)

    const res = await fetch(`${VERCEL_BASE}/v6/deployments?${params}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })

    if (!res.ok) {
      const error = await res.json() as { error: { message: string } }
      throw safeToolError(error.error, 'Vercel', 'execute')
    }

    const data = await res.json() as {
      deployments: Array<{
        uid: string
        name: string
        url: string
        state: string
        target: string | null
        created: number
        ready?: number
        inspectorUrl: string
      }>
    }

    return {
      deployments: data.deployments.map((d) => ({
        id: d.uid,
        name: d.name,
        url: `https://${d.url}`,
        state: d.state,
        target: d.target,
        createdAt: new Date(d.created).toISOString(),
        readyAt: d.ready ? new Date(d.ready).toISOString() : null,
        inspectorUrl: d.inspectorUrl,
      })),
    }
  },
})

export const vercelGetDeployment = defineTool({
  id: 'vercel_get_deployment',
  name: 'Get Vercel Deployment',
  description: 'Gets detailed information about a specific Vercel deployment',
  provider: 'vercel',
  authType: 'oauth2',
  requiredScopes: [],
  inputSchema: z.object({
    idOrUrl: z.string().describe('Deployment ID (e.g. dpl_abc123) or URL').refine(
      (val) => /^dpl_[a-zA-Z0-9]+$/.test(val) || /^https?:\/\//.test(val),
      { message: 'Must be a deployment ID (dpl_xxx) or URL' }
    ),
    teamId: z.string().optional().describe('Team ID or slug'),
  }),
  execute: async ({ input, auth }) => {
    const teamId = input.teamId || (auth.metadata?.team_id as string | undefined)
    const params = new URLSearchParams()
    if (teamId) params.set('teamId', teamId)
    const qs = params.toString() ? `?${params}` : ''

    const res = await fetch(`${VERCEL_BASE}/v13/deployments/${encodeURIComponent(input.idOrUrl)}${qs}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })

    if (!res.ok) {
      const error = await res.json() as { error: { message: string } }
      throw safeToolError(error.error, 'Vercel', 'execute')
    }

    const d = await res.json() as {
      id: string
      name: string
      url: string
      state: string
      target: string | null
      readyState: string
      created: number
      buildingAt: number
      ready: number
      inspectorUrl: string
      meta?: Record<string, string>
    }

    return {
      id: d.id,
      name: d.name,
      url: `https://${d.url}`,
      state: d.state,
      readyState: d.readyState,
      target: d.target,
      createdAt: new Date(d.created).toISOString(),
      buildingAt: d.buildingAt ? new Date(d.buildingAt).toISOString() : null,
      readyAt: d.ready ? new Date(d.ready).toISOString() : null,
      inspectorUrl: d.inspectorUrl,
      meta: d.meta,
    }
  },
})

export const vercelTools = [vercelListDeployments, vercelGetDeployment]
