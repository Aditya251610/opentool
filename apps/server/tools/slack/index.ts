import { defineTool, z } from '@opentool/tool-schema'
import { safeToolError } from '../utils'

const SLACK_BASE = 'https://slack.com/api'

// Resolve a channel name (e.g. "general", "#general") to a channel ID
async function resolveChannel(token: string | undefined, channel: string): Promise<string> {
  if (!token) throw new Error('Slack access token is required')
  // Already a channel ID
  if (/^[CDG][A-Z0-9]+$/.test(channel)) return channel

  const name = channel.replace(/^#/, '')
  const res = await fetch(`${SLACK_BASE}/conversations.list?types=public_channel&limit=200`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json() as { ok: boolean; error?: string; channels?: Array<{ id: string; name: string }> }
  if (!data.ok || !data.channels) throw new Error(`Failed to list channels: ${data.error ?? 'unknown error'}`)

  const found = data.channels.find((c) => c.name === name)
  if (!found) throw new Error(`Channel "${name}" not found. Available: ${data.channels.map(c => c.name).join(', ')}`)
  return found.id
}

// Try to join a channel (best-effort, won't fail if missing scope)
async function tryJoinChannel(token: string | undefined, channelId: string): Promise<void> {
  if (!token) return
  await fetch(`${SLACK_BASE}/conversations.join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: channelId }),
  })
}

export const slackSendMessage = defineTool({
  id: 'slack.send_message',
  name: 'Send Slack Message',
  description: 'Sends a message to a Slack channel or conversation',
  provider: 'slack',
  authType: 'oauth2',
  requiredScopes: ['chat:write'],
  inputSchema: z.object({
    channel: z.string().describe('Channel name (e.g. "general") or ID (e.g. "C1234567890")'),
    text: z.string().describe('Message text (supports Slack markdown/mrkdwn)'),
    thread_ts: z.string().optional().describe('Thread timestamp to reply in a thread'),
    unfurl_links: z.boolean().optional().describe('Whether to unfurl links in the message'),
  }),
  execute: async ({ input, auth }) => {
    const channelId = await resolveChannel(auth.accessToken, input.channel)

    const body: Record<string, unknown> = {
      channel: channelId,
      text: input.text,
    }
    if (input.thread_ts) body.thread_ts = input.thread_ts
    if (input.unfurl_links !== undefined) body.unfurl_links = input.unfurl_links

    let res = await fetch(`${SLACK_BASE}/chat.postMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    let data = await res.json() as {
      ok: boolean
      error?: string
      ts?: string
      channel?: string
      message?: { text: string }
    }

    // Auto-join channel and retry if not_in_channel
    if (!data.ok && data.error === 'not_in_channel') {
      await tryJoinChannel(auth.accessToken, channelId)
      res = await fetch(`${SLACK_BASE}/chat.postMessage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      data = await res.json() as typeof data
    }

    if (!data.ok) {
      throw safeToolError(data, 'Slack', 'execute')
    }

    return {
      timestamp: data.ts,
      channel: data.channel,
      text: data.message?.text,
    }
  },
})

export const slackReadChannel = defineTool({
  id: 'slack.read_channel',
  name: 'Read Slack Channel',
  description: 'Reads recent message history from a Slack channel',
  provider: 'slack',
  authType: 'oauth2',
  requiredScopes: ['channels:history', 'groups:history'],
  inputSchema: z.object({
    channel: z.string().describe('Channel name (e.g. "general") or ID (e.g. "C1234567890")'),
    limit: z.number().optional().describe('Number of messages to return (default 20, max 100)'),
    oldest: z.string().optional().describe('Only messages after this Unix timestamp'),
    latest: z.string().optional().describe('Only messages before this Unix timestamp'),
  }),
  execute: async ({ input, auth }) => {
    const channelId = await resolveChannel(auth.accessToken, input.channel)

    // Auto-join so the bot can read history
    await tryJoinChannel(auth.accessToken, channelId)

    const params = new URLSearchParams({
      channel: channelId,
      limit: String(input.limit ?? 20),
    })
    if (input.oldest) params.set('oldest', input.oldest)
    if (input.latest) params.set('latest', input.latest)

    const res = await fetch(`${SLACK_BASE}/conversations.history?${params}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })

    const data = await res.json() as {
      ok: boolean
      error?: string
      messages?: Array<{
        type: string
        user: string
        text: string
        ts: string
        thread_ts?: string
      }>
      has_more?: boolean
    }

    if (!data.ok) {
      throw safeToolError(data, 'Slack', 'execute')
    }

    return {
      messages: (data.messages ?? []).map((m) => ({
        user: m.user,
        text: m.text,
        timestamp: m.ts,
        threadTimestamp: m.thread_ts,
      })),
      hasMore: data.has_more ?? false,
    }
  },
})

export const slackTools = [slackSendMessage, slackReadChannel]
