import { safeToolError } from '../utils'
import { defineTool, z } from '@opentool/tool-schema'
import { config } from '../../src/config'

export const postgresExecuteQuery = defineTool({
  id: 'postgres_execute_query',
  name: 'Execute PostgreSQL Query',
  description: 'Executes a SQL query against a PostgreSQL database. Requires the pg package.',
  provider: 'postgres',
  authType: 'api_key',
  requiredScopes: [],
  inputSchema: z.object({
    connection_string: z.string().describe('PostgreSQL connection string (e.g. "postgresql://user:pass@host:5432/db")'),
    query: z.string().describe('SQL query to execute'),
    params: z.array(z.string()).optional().describe('Query parameters for parameterized queries'),
  }),
  execute: async ({ input }) => {
    // Query length limit: 10000 chars
    if (input.query.length > 10000) {
      throw new Error('Query exceeds maximum length of 10000 characters')
    }

    // Parse connection string to extract hostname
    let connectionUrl: URL
    try {
      connectionUrl = new URL(input.connection_string)
    } catch (error) {
      throw new Error('Invalid connection string format')
    }

    const hostname = connectionUrl.hostname
    if (!hostname) {
      throw new Error('Connection string must contain a hostname')
    }

    // Check hostname against allowlist
    if (config.postgresAllowedHosts.length === 0) {
      throw new Error(
        'PostgreSQL connections are not configured. ' +
        'Administrator must set POSTGRES_ALLOWED_HOSTS environment variable with comma-separated list of allowed hostnames'
      )
    }

    const isAllowed = config.postgresAllowedHosts.some(
      (allowed) => hostname.toLowerCase() === allowed.toLowerCase()
    )

    if (!isAllowed) {
      throw new Error(
        `PostgreSQL connection to "${hostname}" is not allowed. Allowed hosts: ${config.postgresAllowedHosts.join(', ')}`
      )
    }

    // Dynamic import to avoid compile-time dependency on pg
    let pg: any
    try {
      // Fully dynamic to avoid compile-time module resolution
      const moduleName = 'pg'
      pg = await import(/* webpackIgnore: true */ moduleName)
    } catch {
      throw new Error(
        'PostgreSQL client (pg) is not installed. Run: pnpm add pg -F @opentool/server'
      )
    }

    const client = new pg.Client({ connectionString: input.connection_string })

    try {
      await client.connect()

      // Set query timeout to 30 seconds
      await client.query('SET statement_timeout = 30000')

      const result = await client.query(input.query, input.params)

      // Truncate result rows if exceeds 1000
      const rows = result.rows.slice(0, 1000)
      const truncated = result.rows.length > 1000

      return {
        rows,
        rowCount: result.rowCount,
        fields: result.fields.map((f: { name: string; dataTypeID: number }) => ({
          name: f.name,
          dataTypeID: f.dataTypeID,
        })),
        ...(truncated && { _warning: `Results truncated: returned 1000 of ${result.rows.length} rows` }),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Query execution failed'
      throw safeToolError(error, 'PostgreSQL', 'execute')
    } finally {
      await client.end()
    }
  },
})

export const postgresTools = [postgresExecuteQuery]
