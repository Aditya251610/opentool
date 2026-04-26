import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

// ─── Helpers ──────────────────────────────

function getAccountSid(): string {
  return process.env.TWILIO_ACCOUNT_SID ?? ''
}

function twilioHeaders(authToken: string) {
  const sid = getAccountSid()
  return {
    Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  }
}

function twilioGetHeaders(authToken: string) {
  const sid = getAccountSid()
  return {
    Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString('base64')}`,
    Accept: 'application/json',
  }
}

function getBase(): string {
  return `https://api.twilio.com/2010-04-01/Accounts/${getAccountSid()}`
}

// ─── 1. Send SMS ──────────────────────────

export const twilioSendSms = defineTool({
  id: 'twilio_send_sms',
  name: 'Send SMS via Twilio',
  description:
    'Sends an SMS via Twilio REST API. Requires TWILIO_ACCOUNT_SID env var. Uses TWILIO_SMS_FROM as default sender if from is omitted.\n\nReturns: { sid, status, to, from, body, createdAt, price, errorCode, errorMessage }',
  provider: 'twilio',
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
    to: z.string().describe('Recipient phone number in E.164 format (e.g. "+14155551234")'),
    from: z
      .string()
      .optional()
      .describe('Sender phone number in E.164 format. Defaults to TWILIO_SMS_FROM env var'),
    body: z.string().describe('The text content of the SMS message'),
  }),
  execute: async ({ input, auth }) => {
    const from = input.from ?? process.env.TWILIO_SMS_FROM ?? ''
    const params = new URLSearchParams({ To: input.to, From: from, Body: input.body })

    const res = await fetchWithRetry(
      `${getBase()}/Messages.json`,
      {
        method: 'POST',
        headers: twilioHeaders(auth.apiKey!),
        body: params.toString(),
      },
      'Twilio',
      'send_sms',
    )

    const msg = (await res.json()) as {
      sid: string
      status: string
      to: string
      from: string
      body: string
      date_created: string
      price: string | null
      error_code: number | null
      error_message: string | null
    }

    return {
      sid: msg.sid,
      status: msg.status,
      to: msg.to,
      from: msg.from,
      body: msg.body,
      createdAt: msg.date_created,
      price: msg.price,
      errorCode: msg.error_code,
      errorMessage: msg.error_message,
    }
  },
})

// ─── 2. Send WhatsApp ─────────────────────

export const twilioSendWhatsapp = defineTool({
  id: 'twilio_send_whatsapp',
  name: 'Send WhatsApp Message via Twilio',
  description:
    'Sends a WhatsApp message via Twilio. Auto-prepends whatsapp: prefix to phone numbers. Requires TWILIO_ACCOUNT_SID env var.\n\nReturns: { sid, status, to, from, body, createdAt, price, errorCode, errorMessage }',
  provider: 'twilio',
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
    to: z
      .string()
      .describe(
        'Recipient phone number in E.164 format (e.g. "+14155551234"). The whatsapp: prefix is added automatically',
      ),
    from: z
      .string()
      .optional()
      .describe(
        'Sender phone number in E.164 format. Defaults to TWILIO_WHATSAPP_FROM env var. The whatsapp: prefix is added automatically',
      ),
    body: z.string().describe('The text content of the WhatsApp message'),
  }),
  execute: async ({ input, auth }) => {
    const rawFrom = input.from ?? process.env.TWILIO_WHATSAPP_FROM ?? ''
    const to = input.to.startsWith('whatsapp:') ? input.to : `whatsapp:${input.to}`
    const from = rawFrom.startsWith('whatsapp:') ? rawFrom : `whatsapp:${rawFrom}`
    const params = new URLSearchParams({ To: to, From: from, Body: input.body })

    const res = await fetchWithRetry(
      `${getBase()}/Messages.json`,
      {
        method: 'POST',
        headers: twilioHeaders(auth.apiKey!),
        body: params.toString(),
      },
      'Twilio',
      'send_whatsapp',
    )

    const msg = (await res.json()) as {
      sid: string
      status: string
      to: string
      from: string
      body: string
      date_created: string
      price: string | null
      error_code: number | null
      error_message: string | null
    }

    return {
      sid: msg.sid,
      status: msg.status,
      to: msg.to,
      from: msg.from,
      body: msg.body,
      createdAt: msg.date_created,
      price: msg.price,
      errorCode: msg.error_code,
      errorMessage: msg.error_message,
    }
  },
})

// ─── 3. List Messages ─────────────────────

export const twilioListMessages = defineTool({
  id: 'twilio_list_messages',
  name: 'List Twilio Messages',
  description:
    'Lists sent and received messages with optional filters by recipient, sender, or date.\n\nReturns: [{ sid, status, to, from, body, dateSent, direction, price, errorCode }]',
  provider: 'twilio',
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
    limit: z
      .number()
      .optional()
      .default(20)
      .describe('Maximum number of messages to return (default 20)'),
    to: z.string().optional().describe('Filter by recipient phone number'),
    from: z.string().optional().describe('Filter by sender phone number'),
    date_sent: z.string().optional().describe('Filter by date sent (YYYY-MM-DD format)'),
  }),
  execute: async ({ input, auth }) => {
    const params = new URLSearchParams({ PageSize: String(input.limit ?? 20) })
    if (input.to) params.set('To', input.to)
    if (input.from) params.set('From', input.from)
    if (input.date_sent) params.set('DateSent', input.date_sent)

    const getHeaders = twilioGetHeaders(auth.apiKey!)

    const res = await fetchWithRetry(
      `${getBase()}/Messages.json?${params.toString()}`,
      { headers: getHeaders },
      'Twilio',
      'list_messages',
    )

    const data = (await res.json()) as {
      messages: {
        sid: string
        status: string
        to: string
        from: string
        body: string
        date_sent: string
        direction: string
        price: string | null
        error_code: number | null
      }[]
    }

    return data.messages.map((m) => ({
      sid: m.sid,
      status: m.status,
      to: m.to,
      from: m.from,
      body: m.body,
      dateSent: m.date_sent,
      direction: m.direction,
      price: m.price,
      errorCode: m.error_code,
    }))
  },
})

// ─── 4. Get Message ───────────────────────

export const twilioGetMessage = defineTool({
  id: 'twilio_get_message',
  name: 'Get Twilio Message',
  description:
    'Fetches a single message by SID with full delivery details.\n\nReturns: { sid, status, to, from, body, dateSent, createdAt, updatedAt, direction, price, priceUnit, numSegments, errorCode, errorMessage }',
  provider: 'twilio',
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
    message_sid: z.string().describe('The unique SID of the message (e.g. "SM..." )'),
  }),
  execute: async ({ input, auth }) => {
    const getHeaders = twilioGetHeaders(auth.apiKey!)

    const res = await fetchWithRetry(
      `${getBase()}/Messages/${encodeURIComponent(input.message_sid)}.json`,
      { headers: getHeaders },
      'Twilio',
      'get_message',
    )

    const msg = (await res.json()) as {
      sid: string
      status: string
      to: string
      from: string
      body: string
      date_sent: string
      date_created: string
      date_updated: string
      direction: string
      price: string | null
      price_unit: string | null
      num_segments: string
      error_code: number | null
      error_message: string | null
      uri: string
    }

    return {
      sid: msg.sid,
      status: msg.status,
      to: msg.to,
      from: msg.from,
      body: msg.body,
      dateSent: msg.date_sent,
      createdAt: msg.date_created,
      updatedAt: msg.date_updated,
      direction: msg.direction,
      price: msg.price,
      priceUnit: msg.price_unit,
      numSegments: msg.num_segments,
      errorCode: msg.error_code,
      errorMessage: msg.error_message,
    }
  },
})

// ─── Export ───────────────────────────────

export const twilioTools = [twilioSendSms, twilioSendWhatsapp, twilioListMessages, twilioGetMessage]
