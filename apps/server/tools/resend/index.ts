import { defineTool, z } from '@opentool/tool-schema'

const RESEND_BASE = 'https://api.resend.com'

export const resendSendEmail = defineTool({
  id: 'resend.send_email',
  name: 'Send Email via Resend',
  description: 'Sends an email using the Resend API',
  provider: 'resend',
  authType: 'api_key',
  requiredScopes: [],
  inputSchema: z.object({
    from: z.string().describe('Sender email address (must be from a verified domain)'),
    to: z.string().describe('Recipient email address'),
    subject: z.string().describe('Email subject'),
    html: z.string().optional().describe('Email body as HTML'),
    text: z.string().optional().describe('Email body as plain text'),
    cc: z.array(z.string()).optional().describe('CC email addresses'),
    bcc: z.array(z.string()).optional().describe('BCC email addresses'),
    reply_to: z.string().optional().describe('Reply-to email address'),
    tags: z.array(z.object({
      name: z.string(),
      value: z.string(),
    })).optional().describe('Email tags for tracking'),
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
      const error = await res.json() as { message: string }
      throw new Error(`Resend API error: ${error.message}`)
    }

    const data = await res.json() as { id: string }

    return { id: data.id }
  },
})

export const resendTools = [resendSendEmail]
