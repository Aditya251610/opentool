import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

const DOCKER_HUB_BASE = 'https://hub.docker.com/v2'

function dockerHeaders(token?: string) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

// ─── 1. Search Images ────────────────────

export const dockerSearchImages = defineTool({
  id: 'docker_search_images',
  name: 'Search Docker Images',
  description:
    'Searches Docker Hub for container images. No auth required for public repos.\n\nReturns: { totalCount, results: [{ name, description, stars, pulls, isOfficial, isAutomated }] }',
  provider: 'docker',
  category: 'infrastructure',
  authType: 'none',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    query: z.string().max(200).describe('Search query'),
    page: z.number().min(1).optional().describe('Page number (default 1)'),
    page_size: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
    type: z.enum(['image', 'plugin']).optional().describe('Content type filter'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams({ query: input.query })
    if (input.page) params.set('page', String(input.page))
    if (input.page_size) params.set('page_size', String(input.page_size))
    if (input.type) params.set('type', input.type)

    const res = await fetchWithRetry(
      `${DOCKER_HUB_BASE}/search/repositories/?${params.toString()}`,
      { headers: dockerHeaders(auth.apiKey || undefined) },
      'Docker',
      'search_images',
    )

    const data = (await res.json()) as {
      count: number
      results: {
        repo_name: string
        short_description: string
        star_count: number
        pull_count: number
        is_official: boolean
        is_automated: boolean
      }[]
    }

    return {
      totalCount: data.count,
      results: data.results?.map((r) => ({
        name: r.repo_name,
        description: r.short_description,
        stars: r.star_count,
        pulls: r.pull_count,
        isOfficial: r.is_official,
        isAutomated: r.is_automated,
      })),
    }
  },
})

// ─── 2. Get Image ─────────────────────────

export const dockerGetImage = defineTool({
  id: 'docker_get_image',
  name: 'Get Docker Image',
  description:
    'Fetches Docker Hub repository metadata including description and pull count. Use namespace="library" for official images.\n\nReturns: { name, namespace, description, stars, pulls, lastUpdated, isPrivate, fullDescription }',
  provider: 'docker',
  category: 'infrastructure',
  authType: 'none',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    namespace: z
      .string()
      .optional()
      .describe('Docker Hub namespace/owner (default: "library" for official images)'),
    repository: z.string().describe('Repository name (e.g. "nginx", "node")'),
  }),
  execute: async ({ input, auth }) => {
    const ns = input.namespace ?? 'library'

    const res = await fetchWithRetry(
      `${DOCKER_HUB_BASE}/repositories/${encodeURIComponent(ns)}/${encodeURIComponent(input.repository)}/`,
      { headers: dockerHeaders(auth.apiKey || undefined) },
      'Docker',
      'get_image',
    )

    const repo = (await res.json()) as {
      name: string
      namespace: string
      description: string
      star_count: number
      pull_count: number
      last_updated: string
      is_private: boolean
      full_description: string
    }

    return {
      name: repo.name,
      namespace: repo.namespace,
      description: repo.description,
      stars: repo.star_count,
      pulls: repo.pull_count,
      lastUpdated: repo.last_updated,
      isPrivate: repo.is_private,
      fullDescription: repo.full_description?.substring(0, 2000),
    }
  },
})

// ─── 3. List Tags ─────────────────────────

export const dockerListTags = defineTool({
  id: 'docker_list_tags',
  name: 'List Docker Image Tags',
  description:
    'Lists tags for a Docker Hub repository with size, platform, and digest info.\n\nReturns: { totalCount, tags: [{ name, sizeBytes, lastUpdated, digest, platforms }] }',
  provider: 'docker',
  category: 'infrastructure',
  authType: 'none',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    namespace: z.string().optional().describe('Docker Hub namespace (default: "library")'),
    repository: z.string().describe('Repository name'),
    page: z.number().min(1).optional().describe('Page number'),
    page_size: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
  }),
  execute: async ({ input, auth }) => {
    const ns = input.namespace ?? 'library'
    const params = new URLSearchParams()
    if (input.page) params.set('page', String(input.page))
    if (input.page_size) params.set('page_size', String(input.page_size))

    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetchWithRetry(
      `${DOCKER_HUB_BASE}/repositories/${encodeURIComponent(ns)}/${encodeURIComponent(input.repository)}/tags${qs}`,
      { headers: dockerHeaders(auth.apiKey || undefined) },
      'Docker',
      'list_tags',
    )

    const data = (await res.json()) as {
      count: number
      results: {
        name: string
        full_size: number
        last_updated: string
        digest: string
        images: { architecture: string; os: string }[]
      }[]
    }

    return {
      totalCount: data.count,
      tags: data.results?.map((t) => ({
        name: t.name,
        sizeBytes: t.full_size,
        lastUpdated: t.last_updated,
        digest: t.digest?.substring(0, 19),
        platforms: t.images?.map((i) => `${i.os}/${i.architecture}`),
      })),
    }
  },
})

// ─── 4. Get Image Vulnerabilities ─────────

export const dockerGetImageVulnerabilities = defineTool({
  id: 'docker_get_image_vulnerabilities',
  name: 'Get Docker Image Vulnerabilities',
  description:
    'Fetches vulnerability scan summary from Docker Scout API. Requires Docker Scout to be enabled on the repository.\n\nReturns: raw Docker Scout vulnerability data',
  provider: 'docker',
  category: 'infrastructure',
  authType: 'none',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    namespace: z.string().optional().describe('Docker Hub namespace (default: "library")'),
    repository: z.string().describe('Repository name'),
    tag: z.string().optional().describe('Image tag (default: "latest")'),
  }),
  execute: async ({ input, auth }) => {
    const ns = input.namespace ?? 'library'
    const tag = input.tag ?? 'latest'

    // Docker Scout API — vulnerability overview
    const res = await fetchWithRetry(
      `https://dso-api.docker.com/v1/images/${encodeURIComponent(ns)}/${encodeURIComponent(input.repository)}/tags/${encodeURIComponent(tag)}/vulnerabilities`,
      { headers: dockerHeaders(auth.apiKey || undefined) },
      'Docker',
      'get_vulnerabilities',
    )

    const data = await res.json()
    return data
  },
})

// ─── Export ───────────────────────────────

export const dockerTools = [
  dockerSearchImages,
  dockerGetImage,
  dockerListTags,
  dockerGetImageVulnerabilities,
]
