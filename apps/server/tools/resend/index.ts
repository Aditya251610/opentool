import { safeToolError } from '../utils'
import { defineTool, z } from '@opentool/tool-schema'

const RESEND_BASE = 'https://api.resend.com'

export const resendSendEmail = defineTool({
  id: 'resend_send_email',
  name: 'Send Email via Resend',
  description:
    'Sends an email via Resend API. The from address must use a verified domain. Supports HTML/text body, CC, BCC, reply-to, and tags.\n\nReturns: { id }\n\nExamples:\n  - Simple: from="noreply@yourapp.com", to="user@co.com", subject="Welcome", html="<h1>Hi</h1>"',
  provider: 'resend',
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
    from: z.string().email().describe('Sender email address (must be from a verified domain)'),
    to: z.string().email().describe('Recipient email address'),
    subject: z.string().describe('Email subject'),
    html: z.string().optional().describe('Email body as HTML'),
    text: z.string().optional().describe('Email body as plain text'),
    cc: z.array(z.string().email()).optional().describe('CC email addresses'),
    bcc: z.array(z.string().email()).optional().describe('BCC email addresses'),
    reply_to: z.string().email().optional().describe('Reply-to email address'),
    tags: z
      .array(
        z.object({
          name: z.string().describe('Tag name'),
          value: z.string().describe('Tag value'),
        }),
      )
      .optional()
      .describe('Email tags for tracking'),
  }),
  execute: async ({ input, auth }) => {
    const apiKey = auth.apiKey ?? auth.accessToken
    const body: Record<string, unknown> = {
      from: input.from,
      to: [input.to],
      subject: input.subject,
    }

    if (input.html) body.html = input.html
    if (input.text) body.text = input.text
    if (input.cc) body.cc = input.cc
    if (input.bcc) body.bcc = input.bcc
    if (input.reply_to) body.reply_to = input.reply_to
    if (input.tags) body.tags = input.tags

    const res = await fetch(`${RESEND_BASE}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const error = (await res.json()) as { message: string }
      throw safeToolError(error, 'Resend', 'execute')
    }

    const data = (await res.json()) as { id: string }

    return { id: data.id }
  },
})

export const resendTools = [resendSendEmail]
