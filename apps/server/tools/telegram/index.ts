import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

function telegramUrl(token: string, method: string): string {
  return `https://api.telegram.org/bot${token}/${method}`
}

function telegramHeaders() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

async function parseTelegramResponse(res: Response): Promise<unknown> {
  const body = (await res.json()) as { ok: boolean; result?: unknown; description?: string }
  if (!body.ok) {
    throw new Error(`Telegram API error: ${body.description ?? 'Unknown error'}`)
  }
  return body.result
}

// ─── 1. Get Me ────────────────────────────

export const telegramGetMe = defineTool({
  id: 'telegram_get_me',
  name: 'Get Telegram Bot Info',
  description:
    'Returns info about the bot via Telegram Bot API getMe. Use to verify the bot token is valid.\n\nReturns: { id, isBot, firstName, username }',
  provider: 'telegram',
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
      telegramUrl(auth.apiKey!, 'getMe'),
      { method: 'GET', headers: telegramHeaders() },
      'Telegram',
      'get_me',
    )

    const result = (await parseTelegramResponse(res)) as {
      id: number
      is_bot: boolean
      first_name: string
      username?: string
    }

    return {
      id: result.id,
      isBot: result.is_bot,
      firstName: result.first_name,
      username: result.username ?? null,
    }
  },
})

// ─── 2. Send Message ──────────────────────

export const telegramSendMessage = defineTool({
  id: 'telegram_send_message',
  name: 'Send Telegram Message',
  description:
    'Sends a text message to a chat via Telegram Bot API sendMessage. Bot must be a member of the chat.\n\nReturns: { messageId, chat: { id, type }, date, text }\n\nExamples:\n  - Plain text: chat_id="123456", text="Hello!"\n  - Formatted: chat_id="123456", text="<b>Bold</b>", parse_mode="HTML"',
  provider: 'telegram',
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
    chat_id: z
      .string()
      .describe('Unique identifier for the target chat or username of the target channel'),
    text: z.string().describe('Text of the message to be sent'),
    parse_mode: z
      .enum(['HTML', 'Markdown', 'MarkdownV2'])
      .optional()
      .describe('Mode for parsing entities in the message text'),
  }),
  execute: async ({ input, auth }) => {
    const body: Record<string, unknown> = {
      chat_id: input.chat_id,
      text: input.text,
    }
    if (input.parse_mode) body.parse_mode = input.parse_mode

    const res = await fetchWithRetry(
      telegramUrl(auth.apiKey!, 'sendMessage'),
      {
        method: 'POST',
        headers: telegramHeaders(),
        body: JSON.stringify(body),
      },
      'Telegram',
      'send_message',
    )

    const result = (await parseTelegramResponse(res)) as {
      message_id: number
      chat: { id: number; type: string }
      date: number
      text?: string
    }

    return {
      messageId: result.message_id,
      chat: { id: result.chat.id, type: result.chat.type },
      date: result.date,
      text: result.text ?? null,
    }
  },
})

// ─── 3. Get Updates ───────────────────────

export const telegramGetUpdates = defineTool({
  id: 'telegram_get_updates',
  name: 'Get Telegram Updates',
  description:
    'Polls for bot updates via getUpdates (long polling). Use offset to acknowledge previous updates and avoid duplicates.\n\nReturns: [{ updateId, message: { messageId, from, chat, date, text } }]',
  provider: 'telegram',
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
    offset: z
      .number()
      .optional()
      .describe(
        'Identifier of the first update to be returned; use to acknowledge previous updates',
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of updates to retrieve (1-100, default 100)'),
    timeout: z
      .number()
      .optional()
      .describe('Timeout in seconds for long polling (0 for short polling)'),
  }),
  execute: async ({ input, auth }) => {
    const body: Record<string, unknown> = {}
    if (input.offset !== undefined) body.offset = input.offset
    if (input.limit !== undefined) body.limit = input.limit
    if (input.timeout !== undefined) body.timeout = input.timeout

    const res = await fetchWithRetry(
      telegramUrl(auth.apiKey!, 'getUpdates'),
      {
        method: 'POST',
        headers: telegramHeaders(),
        body: JSON.stringify(body),
      },
      'Telegram',
      'get_updates',
    )

    const result = (await parseTelegramResponse(res)) as {
      update_id: number
      message?: {
        message_id: number
        from?: { id: number; first_name: string; username?: string }
        chat: { id: number; type: string }
        date: number
        text?: string
      }
    }[]

    return result.map((u) => ({
      updateId: u.update_id,
      message: u.message
        ? {
            messageId: u.message.message_id,
            from: u.message.from
              ? {
                  id: u.message.from.id,
                  firstName: u.message.from.first_name,
                  username: u.message.from.username ?? null,
                }
              : null,
            chat: { id: u.message.chat.id, type: u.message.chat.type },
            date: u.message.date,
            text: u.message.text ?? null,
          }
        : null,
    }))
  },
})

// ─── 4. Get Chat ──────────────────────────

export const telegramGetChat = defineTool({
  id: 'telegram_get_chat',
  name: 'Get Telegram Chat',
  description:
    'Fetches chat metadata via getChat. Works for groups, channels, and private chats.\n\nReturns: { id, type, title, username, firstName, description }',
  provider: 'telegram',
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
    chat_id: z
      .string()
      .describe(
        'Unique identifier for the target chat or username of the target supergroup/channel',
      ),
  }),
  execute: async ({ input, auth }) => {
    const res = await fetchWithRetry(
      telegramUrl(auth.apiKey!, 'getChat'),
      {
        method: 'POST',
        headers: telegramHeaders(),
        body: JSON.stringify({ chat_id: input.chat_id }),
      },
      'Telegram',
      'get_chat',
    )

    const result = (await parseTelegramResponse(res)) as {
      id: number
      type: string
      title?: string
      username?: string
      first_name?: string
      description?: string
    }

    return {
      id: result.id,
      type: result.type,
      title: result.title ?? null,
      username: result.username ?? null,
      firstName: result.first_name ?? null,
      description: result.description ?? null,
    }
  },
})

// ─── 5. Send Photo ────────────────────────

export const telegramSendPhoto = defineTool({
  id: 'telegram_send_photo',
  name: 'Send Telegram Photo',
  description:
    'Sends a photo to a chat via sendPhoto. Only supports photo URLs, not file uploads.\n\nReturns: { messageId, chat: { id, type }, date, photo: [{ fileId, width, height }], caption }',
  provider: 'telegram',
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
    chat_id: z
      .string()
      .describe('Unique identifier for the target chat or username of the target channel'),
    photo: z.string().describe('Photo URL to send'),
    caption: z.string().optional().describe('Photo caption (0-1024 characters)'),
  }),
  execute: async ({ input, auth }) => {
    const body: Record<string, unknown> = {
      chat_id: input.chat_id,
      photo: input.photo,
    }
    if (input.caption) body.caption = input.caption

    const res = await fetchWithRetry(
      telegramUrl(auth.apiKey!, 'sendPhoto'),
      {
        method: 'POST',
        headers: telegramHeaders(),
        body: JSON.stringify(body),
      },
      'Telegram',
      'send_photo',
    )

    const result = (await parseTelegramResponse(res)) as {
      message_id: number
      chat: { id: number; type: string }
      date: number
      photo?: { file_id: string; width: number; height: number }[]
      caption?: string
    }

    return {
      messageId: result.message_id,
      chat: { id: result.chat.id, type: result.chat.type },
      date: result.date,
      photo:
        result.photo?.map((p) => ({
          fileId: p.file_id,
          width: p.width,
          height: p.height,
        })) ?? [],
      caption: result.caption ?? null,
    }
  },
})

// ─── Export ───────────────────────────────

export const telegramTools = [
  telegramGetMe,
  telegramSendMessage,
  telegramGetUpdates,
  telegramGetChat,
  telegramSendPhoto,
]
