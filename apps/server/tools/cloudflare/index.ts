import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

const CF_BASE = 'https://api.cloudflare.com/client/v4'

function cfHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

// ─── 1. List Zones ───────────────────────

export const cloudflareListZones = defineTool({
  id: 'cloudflare_list_zones',
  name: 'List Cloudflare Zones',
  description:
    'Lists DNS zones (domains) in the Cloudflare account with optional status/name filter.\n\nReturns: [{ id, name, status, nameServers, plan }]',
  provider: 'cloudflare',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    name: z.string().optional().describe('Filter by domain name (e.g. "example.com")'),
    status: z
      .enum(['active', 'pending', 'initializing', 'moved', 'deleted', 'deactivated'])
      .optional()
      .describe('Zone status filter'),
    per_page: z.number().min(1).max(50).optional().describe('Results per page (max 50)'),
    page: z.number().min(1).optional().describe('Page number'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams()
    if (input.name) params.set('name', input.name)
    if (input.status) params.set('status', input.status)
    if (input.per_page) params.set('per_page', String(input.per_page))
    if (input.page) params.set('page', String(input.page))

    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetchWithRetry(
      `${CF_BASE}/zones${qs}`,
      { headers: cfHeaders(auth.apiKey!) },
      'Cloudflare',
      'list_zones',
    )

    const data = (await res.json()) as {
      result: {
        id: string
        name: string
        status: string
        name_servers: string[]
        plan: { name: string }
      }[]
    }

    return data.result.map((z) => ({
      id: z.id,
      name: z.name,
      status: z.status,
      nameServers: z.name_servers,
      plan: z.plan?.name,
    }))
  },
})

// ─── 2. List DNS Records ─────────────────

export const cloudflareListDnsRecords = defineTool({
  id: 'cloudflare_list_dns_records',
  name: 'List Cloudflare DNS Records',
  description:
    'Lists DNS records for a zone with optional type/name filter.\n\nReturns: [{ id, type, name, content, ttl, proxied }]',
  provider: 'cloudflare',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    zone_id: z.string().describe('Cloudflare Zone ID'),
    type: z
      .enum(['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV', 'CAA'])
      .optional()
      .describe('DNS record type filter'),
    name: z.string().optional().describe('Filter by record name'),
    per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
    page: z.number().min(1).optional().describe('Page number'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams()
    if (input.type) params.set('type', input.type)
    if (input.name) params.set('name', input.name)
    if (input.per_page) params.set('per_page', String(input.per_page))
    if (input.page) params.set('page', String(input.page))

    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetchWithRetry(
      `${CF_BASE}/zones/${encodeURIComponent(input.zone_id)}/dns_records${qs}`,
      { headers: cfHeaders(auth.apiKey!) },
      'Cloudflare',
      'list_dns_records',
    )

    const data = (await res.json()) as {
      result: {
        id: string
        type: string
        name: string
        content: string
        ttl: number
        proxied: boolean
      }[]
    }

    return data.result.map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      content: r.content,
      ttl: r.ttl,
      proxied: r.proxied,
    }))
  },
})

// ─── 3. Create DNS Record ─────────────────

export const cloudflareCreateDnsRecord = defineTool({
  id: 'cloudflare_create_dns_record',
  name: 'Create Cloudflare DNS Record',
  description:
    'Creates a DNS record in a Cloudflare zone. Set proxied=true for Cloudflare CDN/WAF.\n\nReturns: { id, type, name, content, ttl, proxied }',
  provider: 'cloudflare',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    zone_id: z.string().describe('Cloudflare Zone ID'),
    type: z
      .enum(['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV', 'CAA'])
      .describe('DNS record type'),
    name: z.string().describe('Record name (e.g. "sub.example.com" or "@" for root)'),
    content: z.string().describe('Record content (IP address, hostname, or text)'),
    ttl: z.number().min(1).optional().describe('TTL in seconds (1 = automatic)'),
    proxied: z.boolean().optional().describe('Whether traffic is proxied through Cloudflare'),
    priority: z.number().optional().describe('Priority (required for MX records)'),
  }),
  execute: async ({ input, auth }) => {
    const body: Record<string, unknown> = {
      type: input.type,
      name: input.name,
      content: input.content,
    }
    if (input.ttl !== undefined) body.ttl = input.ttl
    if (input.proxied !== undefined) body.proxied = input.proxied
    if (input.priority !== undefined) body.priority = input.priority

    const res = await fetchWithRetry(
      `${CF_BASE}/zones/${encodeURIComponent(input.zone_id)}/dns_records`,
      {
        method: 'POST',
        headers: cfHeaders(auth.apiKey!),
        body: JSON.stringify(body),
      },
      'Cloudflare',
      'create_dns_record',
    )

    const data = (await res.json()) as {
      result: {
        id: string
        type: string
        name: string
        content: string
        ttl: number
        proxied: boolean
      }
    }

    return {
      id: data.result.id,
      type: data.result.type,
      name: data.result.name,
      content: data.result.content,
      ttl: data.result.ttl,
      proxied: data.result.proxied,
    }
  },
})

// ─── 4. Update DNS Record ─────────────────

export const cloudflareUpdateDnsRecord = defineTool({
  id: 'cloudflare_update_dns_record',
  name: 'Update Cloudflare DNS Record',
  description:
    'Updates a DNS record (full replacement via PUT). All fields (type, name, content) are required.\n\nReturns: { id, type, name, content, ttl, proxied }',
  provider: 'cloudflare',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    zone_id: z.string().describe('Cloudflare Zone ID'),
    record_id: z.string().describe('DNS record ID to update'),
    type: z
      .enum(['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV', 'CAA'])
      .describe('DNS record type'),
    name: z.string().describe('Record name'),
    content: z.string().describe('Record content'),
    ttl: z.number().min(1).optional().describe('TTL in seconds (1 = automatic)'),
    proxied: z.boolean().optional().describe('Whether traffic is proxied through Cloudflare'),
  }),
  execute: async ({ input, auth }) => {
    const body: Record<string, unknown> = {
      type: input.type,
      name: input.name,
      content: input.content,
    }
    if (input.ttl !== undefined) body.ttl = input.ttl
    if (input.proxied !== undefined) body.proxied = input.proxied

    const res = await fetchWithRetry(
      `${CF_BASE}/zones/${encodeURIComponent(input.zone_id)}/dns_records/${encodeURIComponent(input.record_id)}`,
      {
        method: 'PUT',
        headers: cfHeaders(auth.apiKey!),
        body: JSON.stringify(body),
      },
      'Cloudflare',
      'update_dns_record',
    )

    const data = (await res.json()) as {
      result: {
        id: string
        type: string
        name: string
        content: string
        ttl: number
        proxied: boolean
      }
    }

    return {
      id: data.result.id,
      type: data.result.type,
      name: data.result.name,
      content: data.result.content,
      ttl: data.result.ttl,
      proxied: data.result.proxied,
    }
  },
})

// ─── 5. Purge Cache ──────────────────────

export const cloudflarePurgeCache = defineTool({
  id: 'cloudflare_purge_cache',
  name: 'Purge Cloudflare Cache',
  description:
    'Purges Cloudflare cache for a zone. Can purge everything or specific URLs/tags. Enterprise required for tag-based purging.\n\nReturns: { success, id }',
  provider: 'cloudflare',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    zone_id: z.string().describe('Cloudflare Zone ID'),
    purge_everything: z
      .boolean()
      .optional()
      .describe('Purge all cached content (use with caution)'),
    files: z.array(z.string()).optional().describe('Specific URLs to purge (max 30)'),
    tags: z
      .array(z.string())
      .optional()
      .describe('Cache-Tag header values to purge (Enterprise only)'),
  }),
  execute: async ({ input, auth }) => {
    const body: Record<string, unknown> = {}
    if (input.purge_everything) {
      body.purge_everything = true
    } else {
      if (input.files) body.files = input.files.slice(0, 30)
      if (input.tags) body.tags = input.tags
    }

    const res = await fetchWithRetry(
      `${CF_BASE}/zones/${encodeURIComponent(input.zone_id)}/purge_cache`,
      {
        method: 'POST',
        headers: cfHeaders(auth.apiKey!),
        body: JSON.stringify(body),
      },
      'Cloudflare',
      'purge_cache',
    )

    const data = (await res.json()) as {
      result: { id: string }
      success: boolean
    }

    return {
      success: data.success,
      id: data.result?.id,
    }
  },
})

// ─── 6. List Workers ─────────────────────

export const cloudflareListWorkers = defineTool({
  id: 'cloudflare_list_workers',
  name: 'List Cloudflare Workers',
  description:
    'Lists Cloudflare Workers scripts in an account.\n\nReturns: [{ id, etag, modifiedAt }]',
  provider: 'cloudflare',
  category: 'infrastructure',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    account_id: z.string().describe('Cloudflare Account ID'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${CF_BASE}/accounts/${encodeURIComponent(input.account_id)}/workers/scripts`,
      { headers: cfHeaders(auth.apiKey!) },
      'Cloudflare',
      'list_workers',
    )

    const data = (await res.json()) as {
      result: {
        id: string
        etag: string
        modified_on: string
      }[]
    }

    return data.result.map((w) => ({
      id: w.id,
      etag: w.etag,
      modifiedAt: w.modified_on,
    }))
  },
})

// ─── Export ───────────────────────────────

export const cloudflareTools = [
  cloudflareListZones,
  cloudflareListDnsRecords,
  cloudflareCreateDnsRecord,
  cloudflareUpdateDnsRecord,
  cloudflarePurgeCache,
  cloudflareListWorkers,
]
