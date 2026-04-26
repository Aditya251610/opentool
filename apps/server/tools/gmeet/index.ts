import { randomUUID } from 'crypto'
import { defineTool, z } from '@opentool/tool-schema'
import { fetchWithRetry } from '../utils'

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3'

function calHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

// ─── Helper ────────────────────────────────

function extractMeetLink(event: Record<string, unknown>): string | undefined {
  if (typeof event.hangoutLink === 'string') return event.hangoutLink
  const confData = event.conferenceData as { entryPoints?: Array<{ uri?: string }> } | undefined
  return confData?.entryPoints?.[0]?.uri
}

// ─── Create Meeting ────────────────────────

export const gmeetCreateMeeting = defineTool({
  id: 'google_meet_create_meeting',
  name: 'Create Google Meet Meeting',
  description:
    'Creates a new Google Meet meeting by creating a calendar event with video conferencing enabled. Returns the Meet link, event ID, and meeting details.',
  provider: 'google_meet',
  category: 'communication',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/calendar.events'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    summary: z.string().describe('Meeting title'),
    start_time: z
      .string()
      .datetime({ message: 'Must be ISO 8601 datetime' })
      .describe('Start time in ISO 8601 format (e.g. "2024-03-15T10:00:00Z")'),
    end_time: z
      .string()
      .datetime({ message: 'Must be ISO 8601 datetime' })
      .describe('End time in ISO 8601 format (e.g. "2024-03-15T11:00:00Z")'),
    timezone: z
      .string()
      .optional()
      .describe('Timezone for the meeting (e.g. "America/New_York"). Defaults to "UTC"'),
    attendees: z
      .array(z.string().email())
      .optional()
      .describe('List of attendee email addresses to invite'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Google account first')
    const token = auth.accessToken
    const timeZone = input.timezone ?? 'UTC'

    const body: Record<string, unknown> = {
      summary: input.summary,
      start: { dateTime: input.start_time, timeZone },
      end: { dateTime: input.end_time, timeZone },
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }

    if (input.attendees?.length) {
      body.attendees = input.attendees.map((email) => ({ email }))
    }

    const res = await fetchWithRetry(
      `${GCAL_BASE}/calendars/primary/events?conferenceDataVersion=1`,
      {
        method: 'POST',
        headers: calHeaders(token),
        body: JSON.stringify(body),
      },
      'GoogleMeet',
      'create_meeting',
    )

    const event = (await res.json()) as Record<string, unknown> & {
      id: string
      hangoutLink?: string
      summary: string
      start: { dateTime: string }
      end: { dateTime: string }
      conferenceData?: { entryPoints?: Array<{ uri?: string }> }
    }

    return {
      eventId: event.id,
      meetLink: extractMeetLink(event),
      summary: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime,
    }
  },
})

// ─── List Meetings ─────────────────────────

export const gmeetListMeetings = defineTool({
  id: 'google_meet_list_meetings',
  name: 'List Google Meet Meetings',
  description:
    "Lists upcoming Google Meet meetings from the user's calendar. Only returns events that have a Meet video link attached.\n\nReturns: { meetings: [{ id, summary, start, end, meetLink }], count }",
  provider: 'google_meet',
  category: 'communication',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/calendar.events'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    time_max: z
      .string()
      .datetime({ message: 'Must be ISO 8601 datetime' })
      .optional()
      .describe('End of time range in ISO 8601 format. Defaults to 7 days from now'),
    max_results: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of meetings to return (1-50, default 10)'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Google account first')
    const token = auth.accessToken
    const now = new Date()
    const defaultMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: input.time_max ?? defaultMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(input.max_results ?? 10),
    })

    const res = await fetchWithRetry(
      `${GCAL_BASE}/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
      'GoogleMeet',
      'list_meetings',
    )

    const data = (await res.json()) as {
      items?: Array<
        Record<string, unknown> & {
          id: string
          summary?: string
          hangoutLink?: string
          start: { dateTime?: string; date?: string }
          end: { dateTime?: string; date?: string }
          conferenceData?: {
            conferenceSolution?: { name?: string }
            entryPoints?: Array<{ uri?: string }>
          }
        }
      >
    }

    const meetings = (data.items ?? [])
      .filter((e) => {
        if (e.hangoutLink) return true
        if (e.conferenceData?.conferenceSolution?.name === 'Google Meet') return true
        return false
      })
      .map((e) => ({
        id: e.id,
        summary: e.summary,
        start: e.start.dateTime ?? e.start.date,
        end: e.end.dateTime ?? e.end.date,
        meetLink: extractMeetLink(e),
      }))

    return {
      meetings,
      count: meetings.length,
    }
  },
})

// ─── Get Meeting ───────────────────────────

export const gmeetGetMeeting = defineTool({
  id: 'google_meet_get_meeting',
  name: 'Get Google Meet Meeting',
  description:
    'Gets details of a specific Google Meet meeting by its calendar event ID. Returns meeting info including the Meet link, attendees, and status.',
  provider: 'google_meet',
  category: 'communication',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/calendar.events'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe('The calendar event ID of the meeting'),
  }),
  execute: async ({ input, auth }) => {
    if (!auth.accessToken) throw new Error('Not authenticated — connect your Google account first')
    const token = auth.accessToken

    const res = await fetchWithRetry(
      `${GCAL_BASE}/calendars/primary/events/${encodeURIComponent(input.event_id)}`,
      { headers: { Authorization: `Bearer ${token}` } },
      'GoogleMeet',
      'get_meeting',
    )

    const event = (await res.json()) as Record<string, unknown> & {
      id: string
      summary?: string
      hangoutLink?: string
      start: { dateTime?: string; date?: string }
      end: { dateTime?: string; date?: string }
      status: string
      attendees?: Array<{ email: string; responseStatus?: string }>
      conferenceData?: { entryPoints?: Array<{ uri?: string }> }
    }

    return {
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime ?? event.start.date,
      end: event.end.dateTime ?? event.end.date,
      meetLink: extractMeetLink(event),
      attendees: (event.attendees ?? []).map((a) => ({
        email: a.email,
        responseStatus: a.responseStatus,
      })),
      status: event.status,
    }
  },
})

// ─── Export ─────────────────────────────────

export const gmeetTools = [gmeetCreateMeeting, gmeetListMeetings, gmeetGetMeeting]
