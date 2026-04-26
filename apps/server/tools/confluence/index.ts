import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

// ─── Helpers ──────────────────────────────

const ATLASSIAN_RESOURCES_URL = 'https://api.atlassian.com/oauth/token/accessible-resources'

async function getCloudId(token: string): Promise<string> {
  const res = await fetchWithRetry(
    ATLASSIAN_RESOURCES_URL,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    },
    'Confluence',
    'get_cloud_id',
  )
  const sites = (await res.json()) as { id: string; name: string }[]
  if (!sites.length) throw new Error('No Atlassian sites found.')
  return sites[0].id
}

function confHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

// ─── 1. List Spaces ──────────────────────

export const confluenceListSpaces = defineTool({
  id: 'confluence_list_spaces',
  name: 'List Confluence Spaces',
  description:
    'Lists Confluence spaces via the v2 API. Auto-discovers the Atlassian cloud site.\n\nReturns: [{ id, key, name, type, status }]',
  provider: 'confluence',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['read:confluence-content.all', 'write:confluence-content'],
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
      .max(25)
      .optional()
      .describe('Max number of spaces to return (1-25)'),
  }),
  execute: async ({ input, auth }) => {
    const cloudId = await getCloudId(auth.accessToken!)
    const base = `https://api.atlassian.com/ex/confluence/${cloudId}`
    const limit = input.limit ?? 25

    const res = await fetchWithRetry(
      `${base}/wiki/api/v2/spaces?limit=${limit}`,
      { headers: confHeaders(auth.accessToken!) },
      'Confluence',
      'list_spaces',
    )

    const data = (await res.json()) as {
      results: { id: string; key: string; name: string; type: string; status: string }[]
    }

    return data.results.map((s) => ({
      id: s.id,
      key: s.key,
      name: s.name,
      type: s.type,
      status: s.status,
    }))
  },
})

// ─── 2. Search Content ───────────────────

export const confluenceSearchContent = defineTool({
  id: 'confluence_search_content',
  name: 'Search Confluence Content',
  description:
    'Searches Confluence using CQL (Confluence Query Language) via the v1 search API.\n\nReturns: [{ content: { id, title, type, space }, url }]\n\nExamples:\n  - Pages about DBs: cql="type=page AND text~database"\n  - Recent in space: cql="space=ENG AND lastModified>now(\'-7d\')"',
  provider: 'confluence',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['read:confluence-content.all', 'write:confluence-content'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    cql: z.string().describe('CQL query e.g. "type=page AND text~database"'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(25)
      .optional()
      .describe('Max number of results to return (1-25)'),
  }),
  execute: async ({ input, auth }) => {
    const cloudId = await getCloudId(auth.accessToken!)
    const base = `https://api.atlassian.com/ex/confluence/${cloudId}`
    const limit = input.limit ?? 25

    const res = await fetchWithRetry(
      `${base}/wiki/rest/api/search?cql=${encodeURIComponent(input.cql)}&limit=${limit}`,
      { headers: confHeaders(auth.accessToken!) },
      'Confluence',
      'search_content',
    )

    const data = (await res.json()) as {
      results: {
        content: { id: string; title: string; type: string; space: { key: string } }
        url: string
      }[]
    }

    return data.results.map((r) => ({
      content: {
        id: r.content.id,
        title: r.content.title,
        type: r.content.type,
        space: { key: r.content.space.key },
      },
      url: r.url,
    }))
  },
})

// ─── 3. Get Page ─────────────────────────

export const confluenceGetPage = defineTool({
  id: 'confluence_get_page',
  name: 'Get Confluence Page',
  description:
    'Fetches a Confluence page by ID with body in storage format (XHTML). Use confluence_list_pages to find page IDs.\n\nReturns: { id, title, spaceId, status, body, version: { number } }',
  provider: 'confluence',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['read:confluence-content.all', 'write:confluence-content'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    page_id: z.string().describe('The ID of the page to retrieve'),
  }),
  execute: async ({ input, auth }) => {
    const cloudId = await getCloudId(auth.accessToken!)
    const base = `https://api.atlassian.com/ex/confluence/${cloudId}`

    const res = await fetchWithRetry(
      `${base}/wiki/api/v2/pages/${input.page_id}?body-format=storage`,
      { headers: confHeaders(auth.accessToken!) },
      'Confluence',
      'get_page',
    )

    const page = (await res.json()) as {
      id: string
      title: string
      spaceId: string
      status: string
      body: { storage: { value: string } }
      version: { number: number }
    }

    return {
      id: page.id,
      title: page.title,
      spaceId: page.spaceId,
      status: page.status,
      body: page.body.storage.value,
      version: { number: page.version.number },
    }
  },
})

// ─── 4. Create Page ──────────────────────

export const confluenceCreatePage = defineTool({
  id: 'confluence_create_page',
  name: 'Create Confluence Page',
  description:
    'Creates a page in a Confluence space. Content must be in Confluence storage format (XHTML-like).\n\nReturns: { id, title, spaceId, status, version: { number } }',
  provider: 'confluence',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['read:confluence-content.all', 'write:confluence-content'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    space_id: z.string().describe('The ID of the space to create the page in'),
    title: z.string().describe('Page title'),
    content: z.string().describe('Page content in Confluence storage format (HTML-like)'),
  }),
  execute: async ({ input, auth }) => {
    const cloudId = await getCloudId(auth.accessToken!)
    const base = `https://api.atlassian.com/ex/confluence/${cloudId}`

    const res = await fetchWithRetry(
      `${base}/wiki/api/v2/pages`,
      {
        method: 'POST',
        headers: confHeaders(auth.accessToken!),
        body: JSON.stringify({
          spaceId: input.space_id,
          title: input.title,
          body: { representation: 'storage', value: input.content },
          status: 'current',
        }),
      },
      'Confluence',
      'create_page',
    )

    const page = (await res.json()) as {
      id: string
      title: string
      spaceId: string
      status: string
      version: { number: number }
    }

    return {
      id: page.id,
      title: page.title,
      spaceId: page.spaceId,
      status: page.status,
      version: { number: page.version.number },
    }
  },
})

// ─── 5. Update Page ──────────────────────

export const confluenceUpdatePage = defineTool({
  id: 'confluence_update_page',
  name: 'Update Confluence Page',
  description:
    'Updates a Confluence page. You must provide the current version_number (it will be auto-incremented). Get it from confluence_get_page.\n\nReturns: { id, title, spaceId, status, version: { number } }',
  provider: 'confluence',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['read:confluence-content.all', 'write:confluence-content'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    page_id: z.string().describe('The ID of the page to update'),
    title: z.string().describe('Updated page title'),
    content: z.string().describe('Page content in Confluence storage format (HTML-like)'),
    version_number: z.number().int().describe('Current version number - will be incremented'),
    version_message: z.string().optional().describe('Optional message describing the update'),
  }),
  execute: async ({ input, auth }) => {
    const cloudId = await getCloudId(auth.accessToken!)
    const base = `https://api.atlassian.com/ex/confluence/${cloudId}`

    const res = await fetchWithRetry(
      `${base}/wiki/api/v2/pages/${input.page_id}`,
      {
        method: 'PUT',
        headers: confHeaders(auth.accessToken!),
        body: JSON.stringify({
          id: input.page_id,
          title: input.title,
          body: { representation: 'storage', value: input.content },
          version: {
            number: input.version_number + 1,
            message: input.version_message ?? '',
          },
          status: 'current',
        }),
      },
      'Confluence',
      'update_page',
    )

    const page = (await res.json()) as {
      id: string
      title: string
      spaceId: string
      status: string
      version: { number: number }
    }

    return {
      id: page.id,
      title: page.title,
      spaceId: page.spaceId,
      status: page.status,
      version: { number: page.version.number },
    }
  },
})

// ─── 6. List Pages in Space ─────────────

export const confluenceListPages = defineTool({
  id: 'confluence_list_pages',
  name: 'List Confluence Pages',
  description:
    'Lists pages in a Confluence space by space ID.\n\nReturns: [{ id, title, status, version: { number } }]',
  provider: 'confluence',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['read:confluence-content.all', 'write:confluence-content'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    space_id: z.string().describe('The ID of the space to list pages from'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(25)
      .optional()
      .describe('Max number of pages to return (1-25)'),
  }),
  execute: async ({ input, auth }) => {
    const cloudId = await getCloudId(auth.accessToken!)
    const base = `https://api.atlassian.com/ex/confluence/${cloudId}`
    const limit = input.limit ?? 25

    const res = await fetchWithRetry(
      `${base}/wiki/api/v2/spaces/${input.space_id}/pages?limit=${limit}`,
      { headers: confHeaders(auth.accessToken!) },
      'Confluence',
      'list_pages',
    )

    const data = (await res.json()) as {
      results: {
        id: string
        title: string
        status: string
        version: { number: number }
      }[]
    }

    return data.results.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      version: { number: p.version.number },
    }))
  },
})

// ─── Export ──────────────────────────────

export const confluenceTools = [
  confluenceListSpaces,
  confluenceSearchContent,
  confluenceGetPage,
  confluenceCreatePage,
  confluenceUpdatePage,
  confluenceListPages,
]
