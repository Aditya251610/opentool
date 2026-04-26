import { safeToolError } from '../utils'
import { defineTool, z } from '@opentool/tool-schema'

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3'

export const googleCalendarCreateEvent = defineTool({
  id: 'google_calendar_create_event',
  name: 'Create Google Calendar Event',
  description:
    'Creates a Google Calendar event via the Calendar API. Supports attendees and custom timezone.\n\nReturns: { id, url, summary, start, end, status }\n\nExamples:\n  - Meeting: summary="Standup", start="2024-03-15T10:00:00Z", end="2024-03-15T10:30:00Z"\n  - With attendees: summary="Review", start="...", end="...", attendees=["alice@co.com"]',
  provider: 'google_calendar',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/calendar'],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    summary: z.string().describe('Event title'),
    description: z.string().optional().describe('Event description'),
    start: z
      .string()
      .datetime({ message: 'Must be ISO 8601 datetime' })
      .describe('Start time in ISO 8601 format (e.g. "2024-03-15T10:00:00-05:00")'),
    end: z
      .string()
      .datetime({ message: 'Must be ISO 8601 datetime' })
      .describe('End time in ISO 8601 format'),
    location: z.string().optional().describe('Event location'),
    attendees: z.array(z.string().email()).optional().describe('List of attendee email addresses'),
    calendar_id: z.string().optional().describe('Calendar ID (default: "primary")'),
    timezone: z.string().optional().describe('Timezone (e.g. "America/New_York")'),
  }),
  execute: async ({ input, auth }) => {
    const calendarId = input.calendar_id ?? 'primary'
    const timeZone = input.timezone ?? 'UTC'

    const body: Record<string, unknown> = {
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: { dateTime: input.start, timeZone },
      end: { dateTime: input.end, timeZone },
    }

    if (input.attendees?.length) {
      body.attendees = input.attendees.map((email) => ({ email }))
    }

    const res = await fetch(`${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const error = (await res.json()) as { error: { message: string } }
      throw safeToolError(error.error, 'Google Calendar', 'execute')
    }

    const event = (await res.json()) as {
      id: string
      htmlLink: string
      summary: string
      start: { dateTime: string }
      end: { dateTime: string }
      status: string
    }

    return {
      id: event.id,
      url: event.htmlLink,
      summary: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime,
      status: event.status,
    }
  },
})

export const googleCalendarListEvents = defineTool({
  id: 'google_calendar_list_events',
  name: 'List Google Calendar Events',
  description:
    'Lists upcoming events from Google Calendar. Returns events with pagination metadata.\n\nReturns: { events: [{ id, url, summary, description, location, start, end, status }], count, has_more }',
  provider: 'google_calendar',
  category: 'productivity',
  authType: 'oauth2',
  requiredScopes: ['https://www.googleapis.com/auth/calendar'],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    calendar_id: z.string().optional().describe('Calendar ID (default: "primary")'),
    time_min: z
      .string()
      .datetime({ message: 'Must be ISO 8601 datetime' })
      .optional()
      .describe('Start of time range in ISO 8601 (default: now)'),
    time_max: z
      .string()
      .datetime({ message: 'Must be ISO 8601 datetime' })
      .optional()
      .describe('End of time range in ISO 8601'),
    max_results: z
      .number()
      .int()
      .positive()
      .max(250)
      .optional()
      .describe('Maximum events to return (default 10, max 250)'),
    query: z.string().optional().describe('Free-text search query'),
  }),
  execute: async ({ input, auth }) => {
    const calendarId = input.calendar_id ?? 'primary'
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(input.max_results ?? 10),
      timeMin: input.time_min ?? new Date().toISOString(),
    })
    if (input.time_max) params.set('timeMax', input.time_max)
    if (input.query) params.set('q', input.query)

    const res = await fetch(
      `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      },
    )

    if (!res.ok) {
      const error = (await res.json()) as { error: { message: string } }
      throw safeToolError(error.error, 'Google Calendar', 'execute')
    }

    const data = (await res.json()) as {
      items: Array<{
        id: string
        htmlLink: string
        summary: string
        description?: string
        location?: string
        start: { dateTime?: string; date?: string }
        end: { dateTime?: string; date?: string }
        status: string
      }>
    }

    return {
      events: (data.items ?? []).map((e) => ({
        id: e.id,
        url: e.htmlLink,
        summary: e.summary,
        description: e.description,
        location: e.location,
        start: e.start.dateTime ?? e.start.date,
        end: e.end.dateTime ?? e.end.date,
        status: e.status,
      })),
      count: (data.items ?? []).length,
      has_more: (data.items ?? []).length >= (input.max_results ?? 10),
    }
  },
})

export const gcalTools = [googleCalendarCreateEvent, googleCalendarListEvents]
