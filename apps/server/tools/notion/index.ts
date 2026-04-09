import { safeToolError } from '../utils'
import { defineTool, z } from '@opentool/tool-schema'

const NOTION_VERSION = '2022-06-28'
const NOTION_BASE = 'https://api.notion.com/v1'

function safeJsonParse(input: string, fieldName: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(input)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${fieldName} must be a JSON object`)
    }
    return parsed as Record<string, unknown>
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${fieldName}: ${e.message}`)
    }
    throw e
  }
}

function safeJsonParseArray(input: string, fieldName: string): unknown[] {
  try {
    const parsed = JSON.parse(input)
    if (!Array.isArray(parsed)) {
      throw new Error(`${fieldName} must be a JSON array`)
    }
    return parsed
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${fieldName}: ${e.message}`)
    }
    throw e
  }
}

function notionHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
}

export const notionCreatePage = defineTool({
  id: 'notion.create_page',
  name: 'Create Notion Page',
  description: 'Creates a new page in a Notion database or as a child of another page',
  provider: 'notion',
  authType: 'oauth2',
  requiredScopes: [],
  inputSchema: z.object({
    parent_type: z.enum(['database_id', 'page_id']).describe('Type of parent: "database_id" or "page_id"'),
    parent_id: z.string().describe('ID of the parent database or page'),
    title: z.string().describe('Page title'),
    properties: z.string().optional().describe('JSON string of additional Notion properties (for database pages)'),
    content: z.string().optional().describe('Plain text content for the page body'),
  }),
  execute: async ({ input, auth }) => {
    const parent = input.parent_type === 'database_id'
      ? { database_id: input.parent_id }
      : { page_id: input.parent_id }

    const properties: Record<string, unknown> = input.properties
      ? safeJsonParse(input.properties, 'properties')
      : {}

    if (input.parent_type === 'database_id') {
      properties['Name'] = properties['Name'] ?? {
        title: [{ text: { content: input.title } }],
      }
    } else {
      properties['title'] = {
        title: [{ text: { content: input.title } }],
      }
    }

    const body: Record<string, unknown> = { parent, properties }

    if (input.content) {
      body.children = [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: input.content } }],
          },
        },
      ]
    }

    const res = await fetch(`${NOTION_BASE}/pages`, {
      method: 'POST',
      headers: notionHeaders(auth.accessToken!),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const error = await res.json() as { message: string }
      throw safeToolError(error, 'Notion', 'execute')
    }

    const page = await res.json() as {
      id: string
      url: string
      created_time: string
    }

    return { id: page.id, url: page.url, createdAt: page.created_time }
  },
})

export const notionQueryDatabase = defineTool({
  id: 'notion.query_database',
  name: 'Query Notion Database',
  description: 'Queries a Notion database with optional filters and sorts',
  provider: 'notion',
  authType: 'oauth2',
  requiredScopes: [],
  inputSchema: z.object({
    database_id: z.string().describe('The ID of the database to query'),
    filter: z.string().optional().describe('JSON string of Notion filter object'),
    sorts: z.string().optional().describe('JSON string of Notion sorts array'),
    page_size: z.number().optional().describe('Number of results to return (max 100)'),
  }),
  execute: async ({ input, auth }) => {
    const body: Record<string, unknown> = {}
    if (input.filter) body.filter = safeJsonParse(input.filter, 'filter')
    if (input.sorts) body.sorts = safeJsonParseArray(input.sorts, 'sorts')
    if (input.page_size) body.page_size = input.page_size

    const res = await fetch(
      `${NOTION_BASE}/databases/${input.database_id}/query`,
      {
        method: 'POST',
        headers: notionHeaders(auth.accessToken!),
        body: JSON.stringify(body),
      }
    )

    if (!res.ok) {
      const error = await res.json() as { message: string }
      throw safeToolError(error, 'Notion', 'execute')
    }

    const data = await res.json() as {
      results: Array<{
        id: string
        url: string
        properties: Record<string, unknown>
        created_time: string
      }>
      has_more: boolean
      next_cursor: string | null
    }

    return {
      results: data.results.map((page) => ({
        id: page.id,
        url: page.url,
        properties: page.properties,
        createdAt: page.created_time,
      })),
      hasMore: data.has_more,
      nextCursor: data.next_cursor,
    }
  },
})

export const notionUpdateBlock = defineTool({
  id: 'notion.update_block',
  name: 'Update Notion Block',
  description: 'Updates the content of an existing block in Notion',
  provider: 'notion',
  authType: 'oauth2',
  requiredScopes: [],
  inputSchema: z.object({
    block_id: z.string().describe('The ID of the block to update'),
    block_type: z.enum(['paragraph', 'heading_1', 'heading_2', 'heading_3', 'to_do', 'bulleted_list_item', 'numbered_list_item'])
      .describe('The type of the block'),
    content: z.string().describe('New text content for the block'),
    checked: z.boolean().optional().describe('For to_do blocks: whether the item is checked'),
  }),
  execute: async ({ input, auth }) => {
    const richText = [{ type: 'text', text: { content: input.content } }]
    const blockContent: Record<string, unknown> = { rich_text: richText }
    if (input.block_type === 'to_do' && input.checked !== undefined) {
      blockContent.checked = input.checked
    }

    const body = { [input.block_type]: blockContent }

    const res = await fetch(`${NOTION_BASE}/blocks/${input.block_id}`, {
      method: 'PATCH',
      headers: notionHeaders(auth.accessToken!),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const error = await res.json() as { message: string }
      throw safeToolError(error, 'Notion', 'execute')
    }

    const block = await res.json() as {
      id: string
      type: string
      last_edited_time: string
    }

    return { id: block.id, type: block.type, lastEditedAt: block.last_edited_time }
  },
})

export const notionTools = [notionCreatePage, notionQueryDatabase, notionUpdateBlock]