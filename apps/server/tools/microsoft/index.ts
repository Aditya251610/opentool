import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

// ─── Helpers ──────────────────────────────

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

function graphHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

// ─── 1. List Emails (Outlook) ─────────────

export const microsoftListEmails = defineTool({
  id: 'microsoft_list_emails',
  name: 'List Outlook Emails',
  description:
    "Lists recent emails from the authenticated user's Outlook mailbox.\n\nReturns: [{ id, subject, from, receivedDateTime, isRead, bodyPreview }]",
  provider: 'microsoft',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['Mail.Read'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of emails to return (1-50, default 20)'),
    filter: z.string().optional().describe('OData $filter expression (e.g. "isRead eq false")'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken)
      throw new Error('Not authenticated — connect your Microsoft account first')
    const token = auth.accessToken
    const top = input.limit ?? 20
    const params = new URLSearchParams({
      $top: String(top),
      $select: 'id,subject,from,receivedDateTime,isRead,bodyPreview',
      $orderby: 'receivedDateTime desc',
    })
    if (input.filter) params.set('$filter', input.filter)

    const res = await fetchWithRetry(
      `${GRAPH_BASE}/me/messages?${params}`,
      { headers: graphHeaders(token) },
      'Microsoft',
      'list_emails',
    )

    const data = (await res.json()) as { value: Record<string, unknown>[] }
    return data.value
  },
})

// ─── 2. Send Email (Outlook) ──────────────

export const microsoftSendEmail = defineTool({
  id: 'microsoft_send_email',
  name: 'Send Outlook Email',
  description:
    'Sends an email via Microsoft Graph API sendMail endpoint. Supports HTML body, CC, and BCC.\n\nReturns: { success, message }\n\nExamples:\n  - Simple email: to=["alice@co.com"], subject="Hi", body="Hello"\n  - With CC: to=["alice@co.com"], subject="Update", body="...", cc=["bob@co.com"]',
  provider: 'microsoft',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['Mail.Send'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    to: z.array(z.string().email()).min(1).describe('Recipient email addresses'),
    subject: z.string().describe('Email subject line'),
    body: z.string().describe('Email body content (HTML supported)'),
    cc: z.array(z.string().email()).optional().describe('CC recipient email addresses'),
    bcc: z.array(z.string().email()).optional().describe('BCC recipient email addresses'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken)
      throw new Error('Not authenticated — connect your Microsoft account first')
    const token = auth.accessToken
    const toRecipients = input.to.map((addr) => ({
      emailAddress: { address: addr },
    }))
    const ccRecipients = input.cc?.map((addr) => ({
      emailAddress: { address: addr },
    }))
    const bccRecipients = input.bcc?.map((addr) => ({
      emailAddress: { address: addr },
    }))

    const message: Record<string, unknown> = {
      subject: input.subject,
      body: { contentType: 'HTML', content: input.body },
      toRecipients,
    }
    if (ccRecipients?.length) message.ccRecipients = ccRecipients
    if (bccRecipients?.length) message.bccRecipients = bccRecipients

    await fetchWithRetry(
      `${GRAPH_BASE}/me/sendMail`,
      {
        method: 'POST',
        headers: graphHeaders(token),
        body: JSON.stringify({ message }),
      },
      'Microsoft',
      'send_email',
    )

    return { success: true, message: `Email sent to ${input.to.join(', ')}` }
  },
})

// ─── 3. Search Emails (Outlook) ───────────

export const microsoftSearchEmails = defineTool({
  id: 'microsoft_search_emails',
  name: 'Search Outlook Emails',
  description:
    "Searches emails in the authenticated user's Outlook mailbox by keyword.\n\nReturns: [{ id, subject, from, receivedDateTime, bodyPreview }]",
  provider: 'microsoft',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['Mail.Read'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    keyword: z.string().describe('Search keyword to find in emails'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(25)
      .optional()
      .describe('Maximum number of results to return (1-25, default 10)'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken)
      throw new Error('Not authenticated — connect your Microsoft account first')
    const token = auth.accessToken
    const top = input.limit ?? 10
    const params = new URLSearchParams({
      $search: `"${input.keyword}"`,
      $top: String(top),
      $select: 'id,subject,from,receivedDateTime,bodyPreview',
    })

    const res = await fetchWithRetry(
      `${GRAPH_BASE}/me/messages?${params}`,
      { headers: graphHeaders(token) },
      'Microsoft',
      'search_emails',
    )

    const data = (await res.json()) as { value: Record<string, unknown>[] }
    return data.value
  },
})

// ─── 4. List Calendar Events ──────────────

export const microsoftListEvents = defineTool({
  id: 'microsoft_list_events',
  name: 'List Outlook Calendar Events',
  description:
    "Lists calendar events within a time range from the authenticated user's Outlook calendar.\n\nReturns: [{ id, subject, start, end, location, organizer, isOnlineMeeting, onlineMeetingUrl }]",
  provider: 'microsoft',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['Calendars.Read'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    start_time: z
      .string()
      .datetime({ message: 'Must be ISO 8601 datetime' })
      .describe('Start of the time range in ISO 8601 format (e.g. "2024-03-15T00:00:00Z")'),
    end_time: z
      .string()
      .datetime({ message: 'Must be ISO 8601 datetime' })
      .describe('End of the time range in ISO 8601 format (e.g. "2024-03-16T00:00:00Z")'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of events to return (1-50, default 20)'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken)
      throw new Error('Not authenticated — connect your Microsoft account first')
    const token = auth.accessToken
    const top = input.limit ?? 20
    const params = new URLSearchParams({
      startDateTime: input.start_time,
      endDateTime: input.end_time,
      $top: String(top),
      $select: 'id,subject,start,end,location,organizer,isOnlineMeeting,onlineMeetingUrl',
    })

    const res = await fetchWithRetry(
      `${GRAPH_BASE}/me/calendarView?${params}`,
      { headers: graphHeaders(token) },
      'Microsoft',
      'list_events',
    )

    const data = (await res.json()) as { value: Record<string, unknown>[] }
    return data.value
  },
})

// ─── 5. Create Calendar Event ─────────────

export const microsoftCreateEvent = defineTool({
  id: 'microsoft_create_event',
  name: 'Create Outlook Calendar Event',
  description:
    'Creates an Outlook calendar event via Microsoft Graph. Set online_meeting=true for a Teams link.\n\nReturns: { id, subject, url, start, end, isOnlineMeeting, onlineMeetingUrl }',
  provider: 'microsoft',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['Calendars.ReadWrite'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    subject: z.string().describe('Event title/subject'),
    start_time: z
      .string()
      .datetime({ message: 'Must be ISO 8601 datetime' })
      .describe('Event start time in ISO 8601 format (e.g. "2024-03-15T10:00:00Z")'),
    end_time: z
      .string()
      .datetime({ message: 'Must be ISO 8601 datetime' })
      .describe('Event end time in ISO 8601 format (e.g. "2024-03-15T11:00:00Z")'),
    timezone: z
      .string()
      .optional()
      .describe('Timezone for the event (e.g. "America/New_York", default "UTC")'),
    body: z.string().optional().describe('Event body/description (HTML supported)'),
    attendees: z.array(z.string().email()).optional().describe('List of attendee email addresses'),
    online_meeting: z
      .boolean()
      .optional()
      .describe('Whether to create an online meeting (default false)'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken)
      throw new Error('Not authenticated — connect your Microsoft account first')
    const token = auth.accessToken
    const timeZone = input.timezone ?? 'UTC'

    const eventBody: Record<string, unknown> = {
      subject: input.subject,
      start: { dateTime: input.start_time, timeZone },
      end: { dateTime: input.end_time, timeZone },
      isOnlineMeeting: input.online_meeting ?? false,
    }

    if (input.body) {
      eventBody.body = { contentType: 'HTML', content: input.body }
    }

    if (input.attendees?.length) {
      eventBody.attendees = input.attendees.map((addr) => ({
        emailAddress: { address: addr, name: addr },
        type: 'required',
      }))
    }

    const res = await fetchWithRetry(
      `${GRAPH_BASE}/me/events`,
      {
        method: 'POST',
        headers: graphHeaders(token),
        body: JSON.stringify(eventBody),
      },
      'Microsoft',
      'create_event',
    )

    const event = (await res.json()) as {
      id: string
      subject: string
      webLink: string
      start: { dateTime: string; timeZone: string }
      end: { dateTime: string; timeZone: string }
      isOnlineMeeting: boolean
      onlineMeetingUrl?: string
    }

    return {
      id: event.id,
      subject: event.subject,
      url: event.webLink,
      start: event.start,
      end: event.end,
      isOnlineMeeting: event.isOnlineMeeting,
      onlineMeetingUrl: event.onlineMeetingUrl,
    }
  },
})

// ─── 6. List Teams ────────────────────────

export const microsoftListTeams = defineTool({
  id: 'microsoft_list_teams',
  name: 'List Microsoft Teams',
  description:
    'Lists the Microsoft Teams the authenticated user has joined.\n\nReturns: [{ id, displayName, description }]',
  provider: 'microsoft',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['Team.ReadBasic.All'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({}),
  execute: async ({ auth }) => {
    if (!auth.accessToken)
      throw new Error('Not authenticated — connect your Microsoft account first')
    const token = auth.accessToken

    const params = new URLSearchParams({
      $select: 'id,displayName,description',
    })

    const res = await fetchWithRetry(
      `${GRAPH_BASE}/me/joinedTeams?${params}`,
      { headers: graphHeaders(token) },
      'Microsoft',
      'list_teams',
    )

    const data = (await res.json()) as { value: Record<string, unknown>[] }
    return data.value
  },
})

// ─── 7. List Channels ─────────────────────

export const microsoftListChannels = defineTool({
  id: 'microsoft_list_channels',
  name: 'List Team Channels',
  description:
    'Lists channels in a Microsoft Teams team.\n\nReturns: [{ id, displayName, description, membershipType }]',
  provider: 'microsoft',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['Channel.ReadBasic.All'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    team_id: z.string().describe('The ID of the team to list channels for'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken)
      throw new Error('Not authenticated — connect your Microsoft account first')
    const token = auth.accessToken

    const params = new URLSearchParams({
      $select: 'id,displayName,description,membershipType',
    })

    const res = await fetchWithRetry(
      `${GRAPH_BASE}/teams/${encodeURIComponent(input.team_id)}/channels?${params}`,
      { headers: graphHeaders(token) },
      'Microsoft',
      'list_channels',
    )

    const data = (await res.json()) as { value: Record<string, unknown>[] }
    return data.value
  },
})

// ─── 8. Send Channel Message (Teams) ──────

export const microsoftSendChannelMessage = defineTool({
  id: 'microsoft_send_channel_message',
  name: 'Send Teams Channel Message',
  description:
    'Sends a message to a Teams channel via Microsoft Graph. Supports HTML content.\n\nReturns: { id, createdDateTime, url }',
  provider: 'microsoft',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['Chat.ReadWrite'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    team_id: z.string().describe('The ID of the team'),
    channel_id: z.string().describe('The ID of the channel to send the message to'),
    content: z.string().describe('Message content (HTML supported)'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken)
      throw new Error('Not authenticated — connect your Microsoft account first')
    const token = auth.accessToken

    const res = await fetchWithRetry(
      `${GRAPH_BASE}/teams/${encodeURIComponent(input.team_id)}/channels/${encodeURIComponent(input.channel_id)}/messages`,
      {
        method: 'POST',
        headers: graphHeaders(token),
        body: JSON.stringify({
          body: { contentType: 'html', content: input.content },
        }),
      },
      'Microsoft',
      'send_channel_message',
    )

    const msg = (await res.json()) as {
      id: string
      createdDateTime: string
      webUrl: string
    }

    return {
      id: msg.id,
      createdDateTime: msg.createdDateTime,
      url: msg.webUrl,
    }
  },
})

// ─── Export ───────────────────────────────

export const microsoftTools = [
  microsoftListEmails,
  microsoftSendEmail,
  microsoftSearchEmails,
  microsoftListEvents,
  microsoftCreateEvent,
  microsoftListTeams,
  microsoftListChannels,
  microsoftSendChannelMessage,
]
