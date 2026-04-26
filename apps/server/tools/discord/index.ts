import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

const DISCORD_BASE = 'https://discord.com/api/v10'

function discordHeaders(token: string) {
  return {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
  }
}

// ─── 1. List Guilds ──────────────────────

export const discordListGuilds = defineTool({
  id: 'discord_list_guilds',
  name: 'List Discord Guilds',
  description:
    'Lists guilds (servers) the bot has joined via GET /users/@me/guilds.\n\nReturns: [{ id, name, icon, owner }]',
  provider: 'discord',
  category: 'communication',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  execute: async ({ auth }) => {
    const res = await fetchWithRetry(
      `${DISCORD_BASE}/users/@me/guilds`,
      { headers: discordHeaders(auth.apiKey!) },
      'Discord',
      'list_guilds',
    )

    const data = (await res.json()) as {
      id: string
      name: string
      icon: string | null
      owner: boolean
    }[]

    return data.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.owner,
    }))
  },
})

// ─── 2. List Channels ───────────────────

export const discordListChannels = defineTool({
  id: 'discord_list_channels',
  name: 'List Discord Channels',
  description:
    'Lists all channels in a guild. Returns all types (text, voice, category). Channel type is a numeric Discord enum.\n\nReturns: [{ id, name, type, position }]',
  provider: 'discord',
  category: 'communication',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    guild_id: z.string().describe('Discord guild (server) ID'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${DISCORD_BASE}/guilds/${encodeURIComponent(input.guild_id)}/channels`,
      { headers: discordHeaders(auth.apiKey!) },
      'Discord',
      'list_channels',
    )

    const data = (await res.json()) as {
      id: string
      name: string
      type: number
      position: number
    }[]

    return data.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      position: c.position,
    }))
  },
})

// ─── 3. Send Message ────────────────────

export const discordSendMessage = defineTool({
  id: 'discord_send_message',
  name: 'Send Discord Message',
  description:
    'Sends a message to a channel via POST /channels/{id}/messages. Max 2000 characters per message.\n\nReturns: { id, channelId, content, timestamp, author: { id, username } }',
  provider: 'discord',
  category: 'communication',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    channel_id: z.string().describe('Discord channel ID to send the message to'),
    content: z.string().describe('Message content (up to 2000 characters)'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${DISCORD_BASE}/channels/${encodeURIComponent(input.channel_id)}/messages`,
      {
        method: 'POST',
        headers: discordHeaders(auth.apiKey!),
        body: JSON.stringify({ content: input.content }),
      },
      'Discord',
      'send_message',
    )

    const data = (await res.json()) as {
      id: string
      channel_id: string
      content: string
      timestamp: string
      author: { id: string; username: string }
    }

    return {
      id: data.id,
      channelId: data.channel_id,
      content: data.content,
      timestamp: data.timestamp,
      author: {
        id: data.author.id,
        username: data.author.username,
      },
    }
  },
})

// ─── 4. Get Message ─────────────────────

export const discordGetMessage = defineTool({
  id: 'discord_get_message',
  name: 'Get Discord Message',
  description:
    'Fetches a single message by ID from a channel.\n\nReturns: { id, channelId, content, timestamp, author: { id, username } }',
  provider: 'discord',
  category: 'communication',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    channel_id: z.string().describe('Discord channel ID'),
    message_id: z.string().describe('Discord message ID to retrieve'),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      `${DISCORD_BASE}/channels/${encodeURIComponent(input.channel_id)}/messages/${encodeURIComponent(input.message_id)}`,
      { headers: discordHeaders(auth.apiKey!) },
      'Discord',
      'get_message',
    )

    const data = (await res.json()) as {
      id: string
      channel_id: string
      content: string
      timestamp: string
      author: { id: string; username: string }
    }

    return {
      id: data.id,
      channelId: data.channel_id,
      content: data.content,
      timestamp: data.timestamp,
      author: {
        id: data.author.id,
        username: data.author.username,
      },
    }
  },
})

// ─── 5. List Messages ───────────────────

export const discordListMessages = defineTool({
  id: 'discord_list_messages',
  name: 'List Discord Messages',
  description:
    'Fetches recent messages from a channel, newest first. Max 100 per request.\n\nReturns: [{ id, channelId, content, timestamp, author: { id, username } }]',
  provider: 'discord',
  category: 'communication',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    channel_id: z.string().describe('Discord channel ID to fetch messages from'),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(50)
      .describe('Number of messages to retrieve (1-100, default 50)'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams()
    if (input.limit) params.set('limit', String(input.limit))

    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await fetchWithRetry(
      `${DISCORD_BASE}/channels/${encodeURIComponent(input.channel_id)}/messages${qs}`,
      { headers: discordHeaders(auth.apiKey!) },
      'Discord',
      'list_messages',
    )

    const data = (await res.json()) as {
      id: string
      channel_id: string
      content: string
      timestamp: string
      author: { id: string; username: string }
    }[]

    return data.map((m) => ({
      id: m.id,
      channelId: m.channel_id,
      content: m.content,
      timestamp: m.timestamp,
      author: {
        id: m.author.id,
        username: m.author.username,
      },
    }))
  },
})

// ─── Export ───────────────────────────────

export const discordTools = [
  discordListGuilds,
  discordListChannels,
  discordSendMessage,
  discordGetMessage,
  discordListMessages,
]
