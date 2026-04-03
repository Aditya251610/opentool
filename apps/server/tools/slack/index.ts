import { defineTool, z } from '@opentool/tool-schema'

const SLACK_BASE = 'https://slack.com/api'

export const slackSendMessage = defineTool({
  id: 'slack.send_message',
  name: 'Send Slack Message',
  description: 'Sends a message to a Slack channel or conversation',
  provider: 'slack',
  authType: 'oauth2',
  requiredScopes: ['chat:write'],
  inputSchema: z.object({
    channel: z.string().describe('Channel ID or name (e.g. "C1234567890" or "#general")'),
    text: z.string().describe('Message text (supports Slack markdown/mrkdwn)'),
    thread_ts: z.string().optional().describe('Thread timestamp to reply in a thread'),
    unfurl_links: z.boolean().optional().describe('Whether to unfurl links in the message'),
  }),
  execute: async ({ input, auth }) => {
    const body: Record<string, unknown> = {
      channel: input.channel,
      text: input.text,
    }
    if (input.thread_ts) body.thread_ts = input.thread_ts
    if (input.unfurl_links !== undefined) body.unfurl_links = input.unfurl_links

    const res = await fetch(`${SLACK_BASE}/chat.postMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json() as {
      ok: boolean
      error?: string
      ts?: string
      channel?: string
      message?: { text: string }
    }

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`)
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
    channel: z.string().describe('Channel ID (e.g. "C1234567890")'),
    limit: z.number().optional().describe('Number of messages to return (default 20, max 100)'),
    oldest: z.string().optional().describe('Only messages after this Unix timestamp'),
    latest: z.string().optional().describe('Only messages before this Unix timestamp'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams({
      channel: input.channel,
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
      throw new Error(`Slack API error: ${data.error}`)
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
