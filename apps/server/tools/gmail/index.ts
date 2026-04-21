import { safeToolError } from '../utils'
import { defineTool, z } from '@opentool/tool-schema'

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

function encodeEmail(to: string, subject: string, body: string, from?: string): string {
  const lines = [
    `To: ${to}`,
    ...(from ? [`From: ${from}`] : []),
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    body,
  ]
  const raw = lines.join('\r\n')
  return Buffer.from(raw).toString('base64url')
}

export const gmailSendEmail = defineTool({
  id: 'gmail_send_email',
  name: 'Send Gmail Email',
  description: 'Sends an email via Gmail',
  provider: 'gmail',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/gmail.send'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    to: z.string().email().describe('Recipient email address'),
    subject: z.string().describe('Email subject'),
    body: z.string().describe('Email body (HTML supported)'),
    cc: z.string().email().optional().describe('CC email address'),
    bcc: z.string().email().optional().describe('BCC email address'),
  }),
  execute: async ({ input, auth }) => {
    const raw = encodeEmail(input.to, input.subject, input.body)

    const res = await fetch(`${GMAIL_BASE}/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    })

    if (!res.ok) {
      const error = (await res.json()) as { error: { message: string } }
      throw safeToolError(error.error, 'Gmail', 'execute')
    }

    const data = (await res.json()) as { id: string; threadId: string; labelIds: string[] }

    return { id: data.id, threadId: data.threadId, labels: data.labelIds }
  },
})

export const gmailReadEmail = defineTool({
  id: 'gmail_read_email',
  name: 'Read Gmail Email',
  description: 'Reads a specific email message by ID',
  provider: 'gmail',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    message_id: z.string().describe('The message ID to read'),
    format: z
      .enum(['full', 'metadata', 'minimal'])
      .optional()
      .describe('Response format (default: full)'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams({ format: input.format ?? 'full' })

    const res = await fetch(`${GMAIL_BASE}/messages/${input.message_id}?${params}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })

    if (!res.ok) {
      const error = (await res.json()) as { error: { message: string } }
      throw safeToolError(error.error, 'Gmail', 'execute')
    }

    const msg = (await res.json()) as {
      id: string
      threadId: string
      snippet: string
      payload: {
        headers: Array<{ name: string; value: string }>
        body?: { data?: string }
        parts?: Array<{ mimeType: string; body?: { data?: string } }>
      }
    }

    const headers = msg.payload.headers
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value

    let bodyText = ''
    if (msg.payload.body?.data) {
      bodyText = Buffer.from(msg.payload.body.data, 'base64url').toString('utf8')
    } else if (msg.payload.parts) {
      const textPart =
        msg.payload.parts.find((p) => p.mimeType === 'text/plain') ??
        msg.payload.parts.find((p) => p.mimeType === 'text/html')
      if (textPart?.body?.data) {
        bodyText = Buffer.from(textPart.body.data, 'base64url').toString('utf8')
      }
    }

    return {
      id: msg.id,
      threadId: msg.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      snippet: msg.snippet,
      body: bodyText,
    }
  },
})

export const gmailSearchEmails = defineTool({
  id: 'gmail_search_emails',
  name: 'Search Gmail Emails',
  description:
    'Searches for emails in Gmail using a query string. Returns results with pagination metadata.\n\nReturns: { results: [{ id, from, subject, date, snippet }], totalEstimate, count, has_more }\n\nExamples:\n  - From a person: query="from:alice@example.com"\n  - Recent with subject: query="subject:invoice newer_than:7d"',
  provider: 'gmail',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    query: z.string().describe('Gmail search query (e.g. "from:user@example.com subject:hello")'),
    max_results: z.number().optional().describe('Maximum number of results (default 10, max 100)'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams({
      q: input.query,
      maxResults: String(input.max_results ?? 10),
    })

    const res = await fetch(`${GMAIL_BASE}/messages?${params}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })

    if (!res.ok) {
      const error = (await res.json()) as { error: { message: string } }
      throw safeToolError(error.error, 'Gmail', 'execute')
    }

    const data = (await res.json()) as {
      messages?: Array<{ id: string; threadId: string }>
      resultSizeEstimate: number
    }

    if (!data.messages?.length) {
      return { results: [], totalEstimate: 0 }
    }

    // Fetch snippet for each message
    const results = await Promise.all(
      data.messages.slice(0, input.max_results ?? 10).map(async (m) => {
        const msgRes = await fetch(`${GMAIL_BASE}/messages/${m.id}?format=metadata`, {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        })
        const msg = (await msgRes.json()) as {
          id: string
          snippet: string
          payload: { headers: Array<{ name: string; value: string }> }
        }
        const getHeader = (name: string) =>
          msg.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value

        return {
          id: msg.id,
          from: getHeader('From'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          snippet: msg.snippet,
        }
      }),
    )

    return {
      results,
      totalEstimate: data.resultSizeEstimate,
      count: results.length,
      has_more: (data.messages?.length ?? 0) > results.length,
    }
  },
})

export const gmailTools = [gmailSendEmail, gmailReadEmail, gmailSearchEmails]
