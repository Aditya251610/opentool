import { describe, it, expect } from 'vitest'
import {
  githubCreateIssue,
  githubListIssues,
  githubCreatePR,
  githubCommentOnIssue,
  githubGetRepo,
} from '../github'
import { notionCreatePage, notionQueryDatabase, notionUpdateBlock } from '../notion'
import { slackSendMessage, slackReadChannel } from '../slack'
import { vercelListDeployments, vercelGetDeployment } from '../vercel'
import { resendSendEmail } from '../resend'
import {
  postgresExecuteQuery,
  postgresListTables,
  postgresDescribeTable,
  postgresRunTransaction,
} from '../postgres'

// ─── GitHub ───────────────────────────────────────────────────────────────────

describe('GitHub create_issue schema', () => {
  it('should accept valid input', () => {
    const result = githubCreateIssue.inputSchema.safeParse({
      owner: 'Aditya251610',
      repo: 'opentool',
      title: 'Test issue',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional body and labels', () => {
    const result = githubCreateIssue.inputSchema.safeParse({
      owner: 'Aditya251610',
      repo: 'opentool',
      title: 'Test',
      body: 'Issue body text',
      labels: ['bug', 'urgent'],
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing required fields', () => {
    expect(githubCreateIssue.inputSchema.safeParse({}).success).toBe(false)
    expect(githubCreateIssue.inputSchema.safeParse({ owner: 'x' }).success).toBe(false)
    expect(githubCreateIssue.inputSchema.safeParse({ owner: 'x', repo: 'y' }).success).toBe(false)
  })
})

describe('GitHub list_issues schema', () => {
  it('should accept valid input with owner and repo', () => {
    const result = githubListIssues.inputSchema.safeParse({
      owner: 'Aditya251610',
      repo: 'opentool',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional state filter', () => {
    const result = githubListIssues.inputSchema.safeParse({
      owner: 'x',
      repo: 'y',
      state: 'open',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing owner/repo', () => {
    expect(githubListIssues.inputSchema.safeParse({}).success).toBe(false)
  })
})

describe('GitHub create_pr schema', () => {
  it('should accept valid PR input', () => {
    const result = githubCreatePR.inputSchema.safeParse({
      owner: 'x',
      repo: 'y',
      title: 'My PR',
      head: 'feature-branch',
      base: 'main',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional body', () => {
    const result = githubCreatePR.inputSchema.safeParse({
      owner: 'x',
      repo: 'y',
      title: 'PR',
      head: 'dev',
      base: 'main',
      body: 'PR description',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing head/base', () => {
    expect(
      githubCreatePR.inputSchema.safeParse({ owner: 'x', repo: 'y', title: 'PR' }).success,
    ).toBe(false)
  })
})

describe('GitHub comment_on_issue schema', () => {
  it('should accept valid input', () => {
    const result = githubCommentOnIssue.inputSchema.safeParse({
      owner: 'x',
      repo: 'y',
      issue_number: 1,
      body: 'A comment',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing body', () => {
    expect(
      githubCommentOnIssue.inputSchema.safeParse({ owner: 'x', repo: 'y', issue_number: 1 })
        .success,
    ).toBe(false)
  })
})

describe('GitHub get_repo schema', () => {
  it('should accept valid input', () => {
    const result = githubGetRepo.inputSchema.safeParse({
      owner: 'Aditya251610',
      repo: 'opentool',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing fields', () => {
    expect(githubGetRepo.inputSchema.safeParse({}).success).toBe(false)
  })
})

// ─── Notion ───────────────────────────────────────────────────────────────────

describe('Notion create_page schema', () => {
  it('should accept valid input', () => {
    const result = notionCreatePage.inputSchema.safeParse({
      parent_type: 'database_id',
      parent_id: 'db-123',
      title: 'Test Page',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional content and properties', () => {
    const result = notionCreatePage.inputSchema.safeParse({
      parent_type: 'page_id',
      parent_id: 'page-123',
      title: 'Test',
      content: 'Some body text',
      properties: '{"Status": "Done"}',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid parent_type', () => {
    expect(
      notionCreatePage.inputSchema.safeParse({
        parent_type: 'invalid',
        parent_id: 'db-123',
        title: 'Test',
      }).success,
    ).toBe(false)
  })

  it('should reject missing title', () => {
    expect(
      notionCreatePage.inputSchema.safeParse({
        parent_type: 'database_id',
        parent_id: 'db-123',
      }).success,
    ).toBe(false)
  })
})

describe('Notion query_database schema', () => {
  it('should accept valid database_id', () => {
    const result = notionQueryDatabase.inputSchema.safeParse({
      database_id: 'db-456',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional filter and sorts', () => {
    const result = notionQueryDatabase.inputSchema.safeParse({
      database_id: 'db-456',
      page_size: 10,
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing database_id', () => {
    expect(notionQueryDatabase.inputSchema.safeParse({}).success).toBe(false)
  })
})

describe('Notion update_block schema', () => {
  it('should accept valid input', () => {
    const result = notionUpdateBlock.inputSchema.safeParse({
      block_id: 'block-789',
      block_type: 'paragraph',
      content: 'Hello world',
    })
    expect(result.success).toBe(true)
  })

  it('should accept to_do with checked', () => {
    const result = notionUpdateBlock.inputSchema.safeParse({
      block_id: 'block-789',
      block_type: 'to_do',
      content: 'Buy groceries',
      checked: true,
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid block_type', () => {
    expect(
      notionUpdateBlock.inputSchema.safeParse({
        block_id: 'block-789',
        block_type: 'invalid_type',
        content: 'Hello',
      }).success,
    ).toBe(false)
  })

  it('should reject missing block_id', () => {
    expect(
      notionUpdateBlock.inputSchema.safeParse({ block_type: 'paragraph', content: 'Hello' })
        .success,
    ).toBe(false)
  })
})

// ─── Slack ────────────────────────────────────────────────────────────────────

describe('Slack send_message schema', () => {
  it('should accept valid input', () => {
    const result = slackSendMessage.inputSchema.safeParse({
      channel: '#general',
      text: 'Hello from OpenTool',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing channel', () => {
    expect(slackSendMessage.inputSchema.safeParse({ text: 'hello' }).success).toBe(false)
  })

  it('should reject missing text', () => {
    expect(slackSendMessage.inputSchema.safeParse({ channel: '#gen' }).success).toBe(false)
  })
})

describe('Slack read_channel schema', () => {
  it('should accept valid input', () => {
    const result = slackReadChannel.inputSchema.safeParse({
      channel: 'C01234',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional limit', () => {
    const result = slackReadChannel.inputSchema.safeParse({
      channel: 'C01234',
      limit: 50,
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing channel', () => {
    expect(slackReadChannel.inputSchema.safeParse({}).success).toBe(false)
  })
})

// ─── Vercel ───────────────────────────────────────────────────────────────────

describe('Vercel list_deployments schema', () => {
  it('should accept valid input with projectId', () => {
    const result = vercelListDeployments.inputSchema.safeParse({
      projectId: 'prj_123',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional teamId and limit', () => {
    const result = vercelListDeployments.inputSchema.safeParse({
      projectId: 'prj_123',
      teamId: 'team_456',
      limit: 20,
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional target filter', () => {
    const result = vercelListDeployments.inputSchema.safeParse({
      projectId: 'prj_123',
      target: 'production',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing projectId', () => {
    expect(vercelListDeployments.inputSchema.safeParse({}).success).toBe(false)
  })
})

describe('Vercel get_deployment schema', () => {
  it('should accept valid deployment ID', () => {
    const result = vercelGetDeployment.inputSchema.safeParse({
      idOrUrl: 'dpl_abc123',
    })
    expect(result.success).toBe(true)
  })

  it('should accept valid URL', () => {
    const result = vercelGetDeployment.inputSchema.safeParse({
      idOrUrl: 'https://my-app.vercel.app',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid format', () => {
    expect(vercelGetDeployment.inputSchema.safeParse({ idOrUrl: 'not-valid' }).success).toBe(false)
  })

  it('should reject missing idOrUrl', () => {
    expect(vercelGetDeployment.inputSchema.safeParse({}).success).toBe(false)
  })
})

// ─── Resend ───────────────────────────────────────────────────────────────────

describe('Resend send_email schema', () => {
  it('should accept valid input', () => {
    const result = resendSendEmail.inputSchema.safeParse({
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Hello',
      html: '<p>Hi there</p>',
    })
    expect(result.success).toBe(true)
  })

  it('should accept text body instead of html', () => {
    const result = resendSendEmail.inputSchema.safeParse({
      from: 'sender@example.com',
      to: 'a@b.com',
      subject: 'Test',
      text: 'Plain text body',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional cc and bcc arrays', () => {
    const result = resendSendEmail.inputSchema.safeParse({
      from: 'sender@example.com',
      to: 'a@b.com',
      subject: 'Test',
      html: '<p>Test</p>',
      cc: ['cc1@example.com'],
      bcc: ['bcc1@example.com'],
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing required fields', () => {
    expect(resendSendEmail.inputSchema.safeParse({}).success).toBe(false)
    expect(resendSendEmail.inputSchema.safeParse({ to: 'a@b.com' }).success).toBe(false)
    expect(resendSendEmail.inputSchema.safeParse({ from: 'a@b.com', to: 'b@c.com' }).success).toBe(
      false,
    )
  })

  it('should reject invalid email format', () => {
    expect(
      resendSendEmail.inputSchema.safeParse({
        from: 'not-email',
        to: 'a@b.com',
        subject: 'Test',
      }).success,
    ).toBe(false)
  })
})

// ─── Postgres ─────────────────────────────────────────────────────────────────

describe('Postgres execute_query schema', () => {
  it('should accept valid query with connection string', () => {
    const result = postgresExecuteQuery.inputSchema.safeParse({
      connection_string: 'postgresql://user:pass@localhost/db',
      query: 'SELECT 1',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional params array', () => {
    const result = postgresExecuteQuery.inputSchema.safeParse({
      connection_string: 'postgresql://user:pass@localhost/db',
      query: 'SELECT * FROM users WHERE id = $1',
      params: ['user-123'],
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing query', () => {
    expect(
      postgresExecuteQuery.inputSchema.safeParse({
        connection_string: 'postgresql://user:pass@localhost/db',
      }).success,
    ).toBe(false)
  })

  it('should reject missing connection_string', () => {
    expect(postgresExecuteQuery.inputSchema.safeParse({ query: 'SELECT 1' }).success).toBe(false)
  })
})

describe('Postgres list_tables schema', () => {
  it('should accept valid connection string', () => {
    const result = postgresListTables.inputSchema.safeParse({
      connection_string: 'postgresql://user:pass@localhost/db',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing connection_string', () => {
    expect(postgresListTables.inputSchema.safeParse({}).success).toBe(false)
  })
})

describe('Postgres describe_table schema', () => {
  it('should accept valid input', () => {
    const result = postgresDescribeTable.inputSchema.safeParse({
      connection_string: 'postgresql://user:pass@localhost/db',
      table: 'users',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional schema', () => {
    const result = postgresDescribeTable.inputSchema.safeParse({
      connection_string: 'postgresql://user:pass@localhost/db',
      table: 'users',
      schema: 'myschema',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing table', () => {
    expect(
      postgresDescribeTable.inputSchema.safeParse({
        connection_string: 'postgresql://user:pass@localhost/db',
      }).success,
    ).toBe(false)
  })
})

describe('Postgres run_transaction schema', () => {
  it('should accept valid transaction statements', () => {
    const result = postgresRunTransaction.inputSchema.safeParse({
      connection_string: 'postgresql://user:pass@localhost/db',
      statements: [
        { query: 'INSERT INTO users (name) VALUES ($1)', params: ['Alice'] },
        { query: 'UPDATE counters SET count = count + 1' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty statements array', () => {
    const result = postgresRunTransaction.inputSchema.safeParse({
      connection_string: 'postgresql://user:pass@localhost/db',
      statements: [],
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing statements', () => {
    expect(
      postgresRunTransaction.inputSchema.safeParse({
        connection_string: 'postgresql://user:pass@localhost/db',
      }).success,
    ).toBe(false)
  })
})

// ─── Tool metadata ────────────────────────────────────────────────────────────

describe('Tool metadata consistency', () => {
  const allTools = [
    githubCreateIssue,
    githubListIssues,
    githubCreatePR,
    githubCommentOnIssue,
    githubGetRepo,
    notionCreatePage,
    notionQueryDatabase,
    notionUpdateBlock,
    slackSendMessage,
    slackReadChannel,
    vercelListDeployments,
    vercelGetDeployment,
    resendSendEmail,
    postgresExecuteQuery,
    postgresListTables,
    postgresDescribeTable,
    postgresRunTransaction,
  ]

  it('every tool should have an id', () => {
    for (const tool of allTools) {
      expect(tool.id).toBeDefined()
      expect(typeof tool.id).toBe('string')
      expect(tool.id.length).toBeGreaterThan(0)
    }
  })

  it('every tool should have a name', () => {
    for (const tool of allTools) {
      expect(tool.name).toBeDefined()
      expect(typeof tool.name).toBe('string')
    }
  })

  it('every tool should have a description', () => {
    for (const tool of allTools) {
      expect(tool.description).toBeDefined()
      expect(typeof tool.description).toBe('string')
    }
  })

  it('every tool should have an inputSchema', () => {
    for (const tool of allTools) {
      expect(tool.inputSchema).toBeDefined()
      expect(typeof tool.inputSchema.safeParse).toBe('function')
    }
  })

  it('tool IDs should be unique', () => {
    const ids = allTools.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
