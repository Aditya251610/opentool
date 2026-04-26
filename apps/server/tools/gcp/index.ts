import { createSign } from 'node:crypto'
import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry, safeToolError } from '../utils'

// ─── Constants & Auth ───────────────────────

let cachedToken: { accessToken: string; expiresAt: number } | null = null

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64url')
}

function getProjectId(input?: string): string {
  return input || process.env.GCP_PROJECT_ID || ''
}

function gcpHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

async function getGcpToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.accessToken
  }

  const keyJson = process.env.GCP_SERVICE_ACCOUNT_KEY
  if (!keyJson) {
    throw new Error('GCP_SERVICE_ACCOUNT_KEY environment variable is not set')
  }

  const key = JSON.parse(keyJson) as {
    client_email: string
    private_key: string
  }

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const iat = now
  const exp = iat + 3600

  const claims = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp,
    }),
  )

  const signingInput = `${header}.${claims}`
  const signer = createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()
  const signature = signer.sign(key.private_key, 'base64url')

  const jwt = `${signingInput}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GCP token exchange failed (HTTP ${res.status}): ${text}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in,
  }

  return cachedToken.accessToken
}

// ─── 1. List Instances ──────────────────────

export const gcpListInstances = defineTool({
  id: 'gcp_list_instances',
  name: 'List GCP Compute Instances',
  description:
    'Lists Compute Engine instances in a zone via GCP REST API. Auth via GCP_SERVICE_ACCOUNT_KEY env var (JWT).\n\nReturns: [{ name, status, machineType, networkInterfaces }]',
  provider: 'gcp',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: ['cloud-platform'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_id: z
      .string()
      .optional()
      .describe('GCP project ID. Falls back to GCP_PROJECT_ID env var'),
    zone: z.string().describe('Compute Engine zone (e.g. us-central1-a)'),
  }),
  execute: async ({ input }) => {
    try {
      const token = await getGcpToken()
      const projectId = getProjectId(input.project_id)

      const res = await fetchWithRetry(
        `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${input.zone}/instances`,
        { headers: gcpHeaders(token) },
        'GCP',
        'list_instances',
      )

      const data = (await res.json()) as {
        items?: {
          name: string
          status: string
          machineType: string
          networkInterfaces: { networkIP: string; accessConfigs?: { natIP: string }[] }[]
        }[]
      }

      return (data.items ?? []).map((i) => ({
        name: i.name,
        status: i.status,
        machineType: i.machineType,
        networkInterfaces: i.networkInterfaces,
      }))
    } catch (error) {
      throw safeToolError(error, 'GCP', 'list_instances')
    }
  },
})

// ─── 2. Get Instance ────────────────────────

export const gcpGetInstance = defineTool({
  id: 'gcp_get_instance',
  name: 'Get GCP Compute Instance',
  description:
    'Fetches full Compute Engine instance details by project, zone, and name. Returns raw GCP API response.\n\nReturns: full GCP Compute instance object',
  provider: 'gcp',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: ['cloud-platform'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_id: z.string().describe('GCP project ID'),
    zone: z.string().describe('Compute Engine zone (e.g. us-central1-a)'),
    instance: z.string().describe('Name of the Compute Engine instance'),
  }),
  execute: async ({ input }) => {
    try {
      const token = await getGcpToken()

      const res = await fetchWithRetry(
        `https://compute.googleapis.com/compute/v1/projects/${input.project_id}/zones/${input.zone}/instances/${input.instance}`,
        { headers: gcpHeaders(token) },
        'GCP',
        'get_instance',
      )

      return await res.json()
    } catch (error) {
      throw safeToolError(error, 'GCP', 'get_instance')
    }
  },
})

// ─── 3. List GKE Clusters ───────────────────

export const gcpListGkeClusters = defineTool({
  id: 'gcp_list_gke_clusters',
  name: 'List GCP GKE Clusters',
  description:
    'Lists GKE clusters across all locations in a project via the Container API.\n\nReturns: [{ name, status, location, currentNodeCount }]',
  provider: 'gcp',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: ['cloud-platform'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_id: z
      .string()
      .optional()
      .describe('GCP project ID. Falls back to GCP_PROJECT_ID env var'),
  }),
  execute: async ({ input }) => {
    try {
      const token = await getGcpToken()
      const projectId = getProjectId(input.project_id)

      const res = await fetchWithRetry(
        `https://container.googleapis.com/v1/projects/${projectId}/locations/-/clusters`,
        { headers: gcpHeaders(token) },
        'GCP',
        'list_gke_clusters',
      )

      const data = (await res.json()) as {
        clusters?: {
          name: string
          status: string
          location: string
          currentNodeCount: number
        }[]
      }

      return (data.clusters ?? []).map((c) => ({
        name: c.name,
        status: c.status,
        location: c.location,
        currentNodeCount: c.currentNodeCount,
      }))
    } catch (error) {
      throw safeToolError(error, 'GCP', 'list_gke_clusters')
    }
  },
})

// ─── 4. List Cloud Functions ────────────────

export const gcpListFunctions = defineTool({
  id: 'gcp_list_functions',
  name: 'List GCP Cloud Functions',
  description:
    'Lists Cloud Functions v2 across all locations in a project.\n\nReturns: [{ name, state, runtime, url }]',
  provider: 'gcp',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: ['cloud-platform'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_id: z
      .string()
      .optional()
      .describe('GCP project ID. Falls back to GCP_PROJECT_ID env var'),
  }),
  execute: async ({ input }) => {
    try {
      const token = await getGcpToken()
      const projectId = getProjectId(input.project_id)

      const res = await fetchWithRetry(
        `https://cloudfunctions.googleapis.com/v2/projects/${projectId}/locations/-/functions`,
        { headers: gcpHeaders(token) },
        'GCP',
        'list_functions',
      )

      const data = (await res.json()) as {
        functions?: {
          name: string
          state: string
          buildConfig?: { runtime: string }
          serviceConfig?: { uri: string }
        }[]
      }

      return (data.functions ?? []).map((fn) => ({
        name: fn.name,
        state: fn.state,
        runtime: fn.buildConfig?.runtime ?? 'unknown',
        url: fn.serviceConfig?.uri ?? '',
      }))
    } catch (error) {
      throw safeToolError(error, 'GCP', 'list_functions')
    }
  },
})

// ─── 5. List Buckets ────────────────────────

export const gcpListBuckets = defineTool({
  id: 'gcp_list_buckets',
  name: 'List GCP Cloud Storage Buckets',
  description:
    'Lists Cloud Storage buckets in a project via the JSON API.\n\nReturns: [{ name, location, storageClass }]',
  provider: 'gcp',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: ['cloud-platform'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_id: z
      .string()
      .optional()
      .describe('GCP project ID. Falls back to GCP_PROJECT_ID env var'),
  }),
  execute: async ({ input }) => {
    try {
      const token = await getGcpToken()
      const projectId = getProjectId(input.project_id)

      const res = await fetchWithRetry(
        `https://storage.googleapis.com/storage/v1/b?project=${projectId}`,
        { headers: gcpHeaders(token) },
        'GCP',
        'list_buckets',
      )

      const data = (await res.json()) as {
        items?: {
          name: string
          location: string
          storageClass: string
        }[]
      }

      return (data.items ?? []).map((b) => ({
        name: b.name,
        location: b.location,
        storageClass: b.storageClass,
      }))
    } catch (error) {
      throw safeToolError(error, 'GCP', 'list_buckets')
    }
  },
})

// ─── 6. List Bucket Objects ─────────────────

export const gcpListBucketObjects = defineTool({
  id: 'gcp_list_bucket_objects',
  name: 'List GCP Bucket Objects',
  description:
    'Lists objects in a Cloud Storage bucket with optional prefix filter.\n\nReturns: [{ name, size, contentType, updated }]',
  provider: 'gcp',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: ['cloud-platform'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    bucket: z.string().describe('Name of the Cloud Storage bucket'),
    prefix: z.string().optional().describe('Object name prefix to filter results'),
    max_results: z
      .number()
      .optional()
      .default(100)
      .describe('Maximum number of objects to return (default 100)'),
  }),
  execute: async ({ input }) => {
    try {
      const token = await getGcpToken()

      const params = new URLSearchParams()
      if (input.prefix) params.set('prefix', input.prefix)
      params.set('maxResults', String(input.max_results ?? 100))

      const query = params.toString()
      const res = await fetchWithRetry(
        `https://storage.googleapis.com/storage/v1/b/${input.bucket}/o?${query}`,
        { headers: gcpHeaders(token) },
        'GCP',
        'list_bucket_objects',
      )

      const data = (await res.json()) as {
        items?: {
          name: string
          size: string
          contentType: string
          updated: string
        }[]
      }

      return (data.items ?? []).map((o) => ({
        name: o.name,
        size: o.size,
        contentType: o.contentType,
        updated: o.updated,
      }))
    } catch (error) {
      throw safeToolError(error, 'GCP', 'list_bucket_objects')
    }
  },
})

// ─── 7. Get Project ─────────────────────────

export const gcpGetProject = defineTool({
  id: 'gcp_get_project',
  name: 'Get GCP Project',
  description:
    'Fetches GCP project metadata and lifecycle state via Resource Manager API.\n\nReturns: { name, projectId, lifecycleState }',
  provider: 'gcp',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: ['cloud-platform'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    project_id: z
      .string()
      .optional()
      .describe('GCP project ID. Falls back to GCP_PROJECT_ID env var'),
  }),
  execute: async ({ input }) => {
    try {
      const token = await getGcpToken()
      const projectId = getProjectId(input.project_id)

      const res = await fetchWithRetry(
        `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`,
        { headers: gcpHeaders(token) },
        'GCP',
        'get_project',
      )

      const project = (await res.json()) as {
        name: string
        projectId: string
        lifecycleState: string
      }

      return {
        name: project.name,
        projectId: project.projectId,
        lifecycleState: project.lifecycleState,
      }
    } catch (error) {
      throw safeToolError(error, 'GCP', 'get_project')
    }
  },
})

// ─── Export all tools ───────────────────────

export const gcpTools = [
  gcpListInstances,
  gcpGetInstance,
  gcpListGkeClusters,
  gcpListFunctions,
  gcpListBuckets,
  gcpListBucketObjects,
  gcpGetProject,
]
