import { describe, it, expect } from 'vitest'
import { gmailSendEmail, gmailReadEmail, gmailSearchEmails } from '../gmail'
import { gcalCreateEvent, gcalListEvents } from '../gcal'
import { stripeCreatePaymentLink, stripeListCustomers } from '../stripe'
import { linearCreateIssue, linearUpdateIssueStatus } from '../linear'

describe('Gmail send_email schema', () => {
  it('should accept valid email input', () => {
    const input = {
      to: 'recipient@example.com',
      subject: 'Test Subject',
      body: '<h1>Test</h1>',
    }
    const result = gmailSendEmail.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept email with optional cc', () => {
    const input = {
      to: 'recipient@example.com',
      subject: 'Test',
      body: 'Body',
      cc: 'cc@example.com',
    }
    const result = gmailSendEmail.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept email with optional bcc', () => {
    const input = {
      to: 'recipient@example.com',
      subject: 'Test',
      body: 'Body',
      bcc: 'bcc@example.com',
    }
    const result = gmailSendEmail.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should reject invalid email format', () => {
    const input = {
      to: 'not-an-email',
      subject: 'Test',
      body: 'Body',
    }
    const result = gmailSendEmail.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should reject missing required fields', () => {
    const input = {
      to: 'recipient@example.com',
      // missing subject and body
    }
    const result = gmailSendEmail.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should reject invalid cc email', () => {
    const input = {
      to: 'recipient@example.com',
      subject: 'Test',
      body: 'Body',
      cc: 'invalid-email',
    }
    const result = gmailSendEmail.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should reject invalid bcc email', () => {
    const input = {
      to: 'recipient@example.com',
      subject: 'Test',
      body: 'Body',
      bcc: 'invalid-email',
    }
    const result = gmailSendEmail.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('Gmail read_email schema', () => {
  it('should accept valid message_id', () => {
    const input = {
      message_id: '1234567890',
    }
    const result = gmailReadEmail.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept valid format options', () => {
    const formats = ['full', 'metadata', 'minimal']
    for (const format of formats) {
      const input = {
        message_id: '1234567890',
        format,
      }
      const result = gmailReadEmail.inputSchema.safeParse(input)
      expect(result.success).toBe(true)
    }
  })

  it('should reject invalid format', () => {
    const input = {
      message_id: '1234567890',
      format: 'invalid_format',
    }
    const result = gmailReadEmail.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should require message_id', () => {
    const input = {
      format: 'full',
    }
    const result = gmailReadEmail.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('Gmail search_emails schema', () => {
  it('should accept valid search query', () => {
    const input = {
      query: 'from:user@example.com subject:hello',
    }
    const result = gmailSearchEmails.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept max_results as any number', () => {
    const input = {
      query: 'test',
      max_results: 50,
    }
    const result = gmailSearchEmails.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept max_results > 100 (no validation)', () => {
    const input = {
      query: 'test',
      max_results: 101,
    }
    const result = gmailSearchEmails.inputSchema.safeParse(input)
    expect(result.success).toBe(true) // Schema doesn't validate upper bound
  })

  it('should accept max_results = 0 (no validation)', () => {
    const input = {
      query: 'test',
      max_results: 0,
    }
    const result = gmailSearchEmails.inputSchema.safeParse(input)
    expect(result.success).toBe(true) // Schema doesn't validate lower bound
  })

  it('should require query', () => {
    const input = {
      max_results: 10,
    }
    const result = gmailSearchEmails.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('Google Calendar create_event schema', () => {
  it('should accept valid ISO 8601 datetime with Z', () => {
    const input = {
      summary: 'Meeting',
      start: '2024-03-15T10:00:00Z',
      end: '2024-03-15T11:00:00Z',
    }
    const result = gcalCreateEvent.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept datetime with milliseconds and Z', () => {
    const input = {
      summary: 'Meeting',
      start: '2024-03-15T10:00:00.000Z',
      end: '2024-03-15T11:00:00.000Z',
    }
    const result = gcalCreateEvent.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should reject timezone offset format (not z.datetime compatible)', () => {
    const input = {
      summary: 'Meeting',
      start: '2024-03-15T10:00:00-05:00',
      end: '2024-03-15T11:00:00-05:00',
    }
    const result = gcalCreateEvent.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should reject non-datetime string', () => {
    const input = {
      summary: 'Meeting',
      start: 'not-a-datetime',
      end: '2024-03-15T11:00:00Z',
    }
    const result = gcalCreateEvent.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should accept optional attendee emails', () => {
    const input = {
      summary: 'Meeting',
      start: '2024-03-15T10:00:00Z',
      end: '2024-03-15T11:00:00Z',
      attendees: ['alice@example.com', 'bob@example.com'],
    }
    const result = gcalCreateEvent.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should reject invalid attendee email', () => {
    const input = {
      summary: 'Meeting',
      start: '2024-03-15T10:00:00Z',
      end: '2024-03-15T11:00:00Z',
      attendees: ['alice@example.com', 'not-an-email'],
    }
    const result = gcalCreateEvent.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should accept optional description and location', () => {
    const input = {
      summary: 'Meeting',
      start: '2024-03-15T10:00:00Z',
      end: '2024-03-15T11:00:00Z',
      description: 'Team sync',
      location: 'Conference Room A',
    }
    const result = gcalCreateEvent.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept optional calendar_id', () => {
    const input = {
      summary: 'Meeting',
      start: '2024-03-15T10:00:00Z',
      end: '2024-03-15T11:00:00Z',
      calendar_id: 'user@example.com',
    }
    const result = gcalCreateEvent.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept optional timezone', () => {
    const input = {
      summary: 'Meeting',
      start: '2024-03-15T10:00:00Z',
      end: '2024-03-15T11:00:00Z',
      timezone: 'America/New_York',
    }
    const result = gcalCreateEvent.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should require summary', () => {
    const input = {
      start: '2024-03-15T10:00:00Z',
      end: '2024-03-15T11:00:00Z',
    }
    const result = gcalCreateEvent.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should require start and end times', () => {
    const input = {
      summary: 'Meeting',
    }
    const result = gcalCreateEvent.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('Google Calendar list_events schema', () => {
  it('should accept minimal input', () => {
    const input = {}
    const result = gcalListEvents.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept valid Z-terminated datetime range', () => {
    const input = {
      time_min: '2024-03-15T10:00:00Z',
      time_max: '2024-03-15T11:00:00Z',
    }
    const result = gcalListEvents.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should reject datetime with timezone offset (not compatible)', () => {
    const input = {
      time_min: '2024-03-15T10:00:00-05:00',
    }
    const result = gcalListEvents.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should accept max_results within bounds', () => {
    const input = {
      max_results: 100,
    }
    const result = gcalListEvents.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should reject max_results > 250', () => {
    const input = {
      max_results: 251,
    }
    const result = gcalListEvents.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should reject max_results <= 0', () => {
    const input = {
      max_results: 0,
    }
    const result = gcalListEvents.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should accept query string', () => {
    const input = {
      query: 'team sync',
    }
    const result = gcalListEvents.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

describe('Stripe create_payment_link schema', () => {
  it('should accept valid price_id', () => {
    const input = {
      price_id: 'price_1234567890',
    }
    const result = stripeCreatePaymentLink.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept quantity within bounds', () => {
    const input = {
      price_id: 'price_1234567890',
      quantity: 100,
    }
    const result = stripeCreatePaymentLink.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept quantity = 1', () => {
    const input = {
      price_id: 'price_1234567890',
      quantity: 1,
    }
    const result = stripeCreatePaymentLink.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept quantity = 99999', () => {
    const input = {
      price_id: 'price_1234567890',
      quantity: 99999,
    }
    const result = stripeCreatePaymentLink.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should reject quantity = 0', () => {
    const input = {
      price_id: 'price_1234567890',
      quantity: 0,
    }
    const result = stripeCreatePaymentLink.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should reject quantity > 99999', () => {
    const input = {
      price_id: 'price_1234567890',
      quantity: 100000,
    }
    const result = stripeCreatePaymentLink.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should require HTTPS URL', () => {
    const input = {
      price_id: 'price_1234567890',
      after_completion_url: 'http://example.com',
    }
    const result = stripeCreatePaymentLink.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should accept HTTPS URL', () => {
    const input = {
      price_id: 'price_1234567890',
      after_completion_url: 'https://example.com/success',
    }
    const result = stripeCreatePaymentLink.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept optional parameters', () => {
    const input = {
      price_id: 'price_1234567890',
      quantity: 5,
      after_completion_url: 'https://example.com/success',
    }
    const result = stripeCreatePaymentLink.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should require price_id', () => {
    const input = {
      quantity: 1,
    }
    const result = stripeCreatePaymentLink.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('Stripe list_customers schema', () => {
  it('should accept minimal input', () => {
    const input = {}
    const result = stripeListCustomers.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept valid email filter', () => {
    const input = {
      email: 'user@example.com',
    }
    const result = stripeListCustomers.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const input = {
      email: 'not-an-email',
    }
    const result = stripeListCustomers.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should accept limit within bounds', () => {
    const input = {
      limit: 50,
    }
    const result = stripeListCustomers.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept limit = 100', () => {
    const input = {
      limit: 100,
    }
    const result = stripeListCustomers.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should reject limit > 100', () => {
    const input = {
      limit: 101,
    }
    const result = stripeListCustomers.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should reject limit = 0', () => {
    const input = {
      limit: 0,
    }
    const result = stripeListCustomers.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should accept starting_after cursor', () => {
    const input = {
      starting_after: 'cus_1234567890',
    }
    const result = stripeListCustomers.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept all optional parameters', () => {
    const input = {
      email: 'user@example.com',
      limit: 25,
      starting_after: 'cus_xyz',
    }
    const result = stripeListCustomers.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

describe('Linear create_issue schema', () => {
  it('should accept valid issue data', () => {
    const input = {
      teamId: 'TEAM-1',
      title: 'Fix login bug',
    }
    const result = linearCreateIssue.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept all optional fields', () => {
    const input = {
      teamId: 'TEAM-1',
      title: 'Fix login bug',
      description: 'Login is broken on mobile',
      priority: 2,
      assigneeId: 'USER-123',
      labelIds: ['label1', 'label2'],
    }
    const result = linearCreateIssue.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept priority 0', () => {
    const input = {
      teamId: 'TEAM-1',
      title: 'Task',
      priority: 0,
    }
    const result = linearCreateIssue.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept priority 4', () => {
    const input = {
      teamId: 'TEAM-1',
      title: 'Task',
      priority: 4,
    }
    const result = linearCreateIssue.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should reject priority < 0', () => {
    const input = {
      teamId: 'TEAM-1',
      title: 'Task',
      priority: -1,
    }
    const result = linearCreateIssue.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should reject priority > 4', () => {
    const input = {
      teamId: 'TEAM-1',
      title: 'Task',
      priority: 5,
    }
    const result = linearCreateIssue.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should require teamId and title', () => {
    const input = {
      description: 'Just a description',
    }
    const result = linearCreateIssue.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should accept labelIds as array', () => {
    const input = {
      teamId: 'TEAM-1',
      title: 'Task',
      labelIds: ['bug', 'urgent'],
    }
    const result = linearCreateIssue.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept empty labelIds array', () => {
    const input = {
      teamId: 'TEAM-1',
      title: 'Task',
      labelIds: [],
    }
    const result = linearCreateIssue.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

describe('Linear update_issue_status schema', () => {
  it('should accept valid update data', () => {
    const input = {
      issueId: 'ISSUE-123',
      stateId: 'STATE-456',
    }
    const result = linearUpdateIssueStatus.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept optional priority', () => {
    const input = {
      issueId: 'ISSUE-123',
      stateId: 'STATE-456',
      priority: 1,
    }
    const result = linearUpdateIssueStatus.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept priority range 0-4', () => {
    for (let i = 0; i <= 4; i++) {
      const input = {
        issueId: 'ISSUE-123',
        stateId: 'STATE-456',
        priority: i,
      }
      const result = linearUpdateIssueStatus.inputSchema.safeParse(input)
      expect(result.success).toBe(true)
    }
  })

  it('should reject priority < 0', () => {
    const input = {
      issueId: 'ISSUE-123',
      stateId: 'STATE-456',
      priority: -1,
    }
    const result = linearUpdateIssueStatus.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should reject priority > 4', () => {
    const input = {
      issueId: 'ISSUE-123',
      stateId: 'STATE-456',
      priority: 5,
    }
    const result = linearUpdateIssueStatus.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should accept optional assigneeId', () => {
    const input = {
      issueId: 'ISSUE-123',
      stateId: 'STATE-456',
      assigneeId: 'USER-789',
    }
    const result = linearUpdateIssueStatus.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should accept all optional fields', () => {
    const input = {
      issueId: 'ISSUE-123',
      stateId: 'STATE-456',
      priority: 2,
      assigneeId: 'USER-789',
    }
    const result = linearUpdateIssueStatus.inputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should require issueId and stateId', () => {
    const input = {
      priority: 1,
    }
    const result = linearUpdateIssueStatus.inputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})
