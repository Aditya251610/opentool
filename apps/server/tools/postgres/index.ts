import { safeToolError } from '../utils'
import { defineTool, z } from '@opentool/tool-schema'
import { config } from '../../src/config'

// ─── Shared helpers ──────────────────────

function validateConnectionString(connectionString: string): URL {
  let url: URL
  try {
    url = new URL(connectionString)
  } catch (_error) {
    throw new Error('Invalid connection string format')
  }

  const hostname = url.hostname
  if (!hostname) {
    throw new Error('Connection string must contain a hostname')
  }

  if (config.postgresAllowedHosts.length === 0) {
    throw new Error(
      'PostgreSQL connections are not configured. ' +
        'Administrator must set POSTGRES_ALLOWED_HOSTS environment variable with comma-separated list of allowed hostnames',
    )
  }

  const isAllowed = config.postgresAllowedHosts.some(
    (allowed) => hostname.toLowerCase() === allowed.toLowerCase(),
  )

  if (!isAllowed) {
    throw new Error(
      `PostgreSQL connection to "${hostname}" is not allowed. Allowed hosts: ${config.postgresAllowedHosts.join(', ')}`,
    )
  }

  return url
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createPgClient(connectionString: string): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pg: any
  try {
    const moduleName = 'pg'
    pg = await import(/* webpackIgnore: true */ moduleName)
  } catch {
    throw new Error('PostgreSQL client (pg) is not installed. Run: pnpm add pg -F @opentool/server')
  }

  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
  })
  await client.connect()
  return client
}

// ─── Tool: Execute Query ──────────────────

// Dangerous patterns that should be blocked for safety
const DANGEROUS_PATTERNS = [
  /DROP\s+(DATABASE|SCHEMA)\b/i,
  /TRUNCATE\b/i,
  /\bCOPY\b/i,
  /\bGRANT\s+/i,
  /\bREVOKE\s+/i,
  /ALTER\s+SYSTEM\b/i,
  /CREATE\s+EXTENSION\b/i,
  /LOAD\b/i,
]

// Strip SQL comments (block and line) to prevent regex bypass via comment-based obfuscation
function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments
    .replace(/--[^\n]*/g, ' ') // line comments
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
}

function assertSafeQuery(query: string): void {
  const normalized = stripSqlComments(query)
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(normalized)) {
      throw new Error(
        `Query blocked: "${query.slice(0, 40)}..." matches dangerous pattern. ` +
          'DROP DATABASE, DROP SCHEMA, TRUNCATE, COPY, GRANT, REVOKE, ALTER SYSTEM, CREATE EXTENSION, and LOAD are not allowed through this tool.',
      )
    }
  }
}

export const postgresExecuteQuery = defineTool({
  id: 'postgres_execute_query',
  name: 'Execute PostgreSQL Query',
  description:
    'Executes a single SQL query against a PostgreSQL database. Supports read and write operations with parameterized queries. Results are truncated to 1000 rows. Blocks dangerous operations (DROP DATABASE/SCHEMA, TRUNCATE, COPY, GRANT, REVOKE).\n\nReturns: { rows, rowCount, fields: [{ name, dataTypeID }] }\n\nExamples:\n  - SELECT * FROM users WHERE active = $1 (params: ["true"])\n  - INSERT INTO logs (msg) VALUES ($1)',
  provider: 'postgres',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    connection_string: z
      .string()
      .describe('PostgreSQL connection string (e.g. "postgresql://user:pass@host:5432/db")'),
    query: z.string().describe('SQL query to execute'),
    params: z
      .array(z.string())
      .optional()
      .describe('Query parameters for parameterized queries ($1, $2, ...)'),
  }),
  execute: async ({ input }) => {
    if (input.query.length > 10_000) {
      throw new Error('Query exceeds maximum length of 10,000 characters')
    }

    assertSafeQuery(input.query)
    validateConnectionString(input.connection_string)
    const client = await createPgClient(input.connection_string)

    try {
      const result = await client.query(input.query, input.params)

      const rows = result.rows.slice(0, 1000)
      const truncated = result.rows.length > 1000

      return {
        rows,
        rowCount: result.rowCount,
        fields: result.fields?.map((f: { name: string; dataTypeID: number }) => ({
          name: f.name,
          dataTypeID: f.dataTypeID,
        })),
        ...(truncated && {
          _warning: `Results truncated: returned 1000 of ${result.rows.length} rows`,
        }),
      }
    } catch (error) {
      throw safeToolError(error, 'PostgreSQL', 'execute_query')
    } finally {
      await client.end()
    }
  },
})

// ─── Tool: List Tables ──────────────────

export const postgresListTables = defineTool({
  id: 'postgres_list_tables',
  name: 'List Database Tables',
  description:
    'Lists all tables in a PostgreSQL database, including schema name, table name, and estimated row count. Excludes system schemas.\n\nReturns: { tables: [{ schema, table, estimated_rows }], count, schema }',
  provider: 'postgres',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    connection_string: z
      .string()
      .describe('PostgreSQL connection string (e.g. "postgresql://user:pass@host:5432/db")'),
    schema: z
      .string()
      .optional()
      .default('public')
      .describe('Schema to list tables from (default: "public")'),
  }),
  execute: async ({ input }) => {
    validateConnectionString(input.connection_string)
    const client = await createPgClient(input.connection_string)

    try {
      const result = await client.query(
        `SELECT
           schemaname AS schema,
           tablename AS table,
           COALESCE(n_live_tup, 0) AS estimated_rows
         FROM pg_stat_user_tables
         WHERE schemaname = $1
         ORDER BY tablename`,
        [input.schema],
      )

      return {
        tables: result.rows,
        count: result.rows.length,
        schema: input.schema,
      }
    } catch (error) {
      throw safeToolError(error, 'PostgreSQL', 'list_tables')
    } finally {
      await client.end()
    }
  },
})

// ─── Tool: Describe Table Schema ──────────────────

export const postgresDescribeTable = defineTool({
  id: 'postgres_describe_table',
  name: 'Describe Table Schema',
  description:
    'Retrieves the full schema definition of a PostgreSQL table including columns, data types, nullable flags, defaults, primary keys, foreign keys, and indexes.',
  provider: 'postgres',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    connection_string: z
      .string()
      .describe('PostgreSQL connection string (e.g. "postgresql://user:pass@host:5432/db")'),
    table: z.string().describe('Table name to describe'),
    schema: z.string().optional().default('public').describe('Schema name (default: "public")'),
  }),
  execute: async ({ input }) => {
    validateConnectionString(input.connection_string)
    const client = await createPgClient(input.connection_string)

    try {
      // Columns
      const columnsResult = await client.query(
        `SELECT
           column_name,
           data_type,
           character_maximum_length,
           is_nullable,
           column_default
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [input.schema, input.table],
      )

      if (columnsResult.rows.length === 0) {
        throw new Error(`Table "${input.schema}"."${input.table}" not found`)
      }

      // Primary key
      const pkResult = await client.query(
        `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema = $1
           AND tc.table_name = $2
         ORDER BY kcu.ordinal_position`,
        [input.schema, input.table],
      )

      // Foreign keys
      const fkResult = await client.query(
        `SELECT
           kcu.column_name,
           ccu.table_schema AS foreign_schema,
           ccu.table_name AS foreign_table,
           ccu.column_name AS foreign_column
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name
           AND ccu.table_schema = tc.table_schema
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_schema = $1
           AND tc.table_name = $2`,
        [input.schema, input.table],
      )

      // Indexes
      const indexResult = await client.query(
        `SELECT
           indexname AS index_name,
           indexdef AS definition
         FROM pg_indexes
         WHERE schemaname = $1 AND tablename = $2`,
        [input.schema, input.table],
      )

      return {
        table: input.table,
        schema: input.schema,
        columns: columnsResult.rows,
        primaryKey: pkResult.rows.map((r: { column_name: string }) => r.column_name),
        foreignKeys: fkResult.rows,
        indexes: indexResult.rows,
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) throw error
      throw safeToolError(error, 'PostgreSQL', 'describe_table')
    } finally {
      await client.end()
    }
  },
})

// ─── Tool: Run Transaction ──────────────────

export const postgresRunTransaction = defineTool({
  id: 'postgres_run_transaction',
  name: 'Run SQL Transaction',
  description:
    'Executes multiple SQL statements within a single atomic transaction. If any statement fails, the entire transaction is rolled back. Useful for migrations and multi-step data changes. Blocks dangerous operations (DROP DATABASE/SCHEMA, TRUNCATE, COPY, GRANT, REVOKE).',
  provider: 'postgres',
  authType: 'api_key',
  requiredScopes: [],
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: z.object({
    connection_string: z
      .string()
      .describe('PostgreSQL connection string (e.g. "postgresql://user:pass@host:5432/db")'),
    statements: z
      .array(
        z.object({
          query: z.string().describe('SQL statement to execute'),
          params: z.array(z.string()).optional().describe('Query parameters ($1, $2, ...)'),
        }),
      )
      .min(1)
      .max(50)
      .describe('Array of SQL statements to execute in order (max 50)'),
  }),
  execute: async ({ input }) => {
    const totalLength = input.statements.reduce((sum, s) => sum + s.query.length, 0)
    if (totalLength > 50_000) {
      throw new Error('Total query length exceeds maximum of 50,000 characters')
    }

    validateConnectionString(input.connection_string)
    const client = await createPgClient(input.connection_string)

    // Validate all statements before executing any
    for (const stmt of input.statements) {
      assertSafeQuery(stmt.query)
    }

    const results: Array<{ statement: number; rowCount: number | null; status: string }> = []

    try {
      await client.query('BEGIN')

      for (let i = 0; i < input.statements.length; i++) {
        const stmt = input.statements[i]
        const result = await client.query(stmt.query, stmt.params)
        results.push({
          statement: i + 1,
          rowCount: result.rowCount,
          status: 'ok',
        })
      }

      await client.query('COMMIT')

      return {
        status: 'committed',
        statementsExecuted: results.length,
        results,
      }
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw safeToolError(error, 'PostgreSQL', 'run_transaction')
    } finally {
      await client.end()
    }
  },
})

// ─── Export all tools ──────────────────

export const postgresTools = [
  postgresExecuteQuery,
  postgresListTables,
  postgresDescribeTable,
  postgresRunTransaction,
]
