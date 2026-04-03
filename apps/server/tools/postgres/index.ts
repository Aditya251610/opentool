import { defineTool, z } from '@opentool/tool-schema'

export const postgresExecuteQuery = defineTool({
  id: 'postgres.execute_query',
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
      const result = await client.query(input.query, input.params)

      return {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields.map((f: { name: string; dataTypeID: number }) => ({
          name: f.name,
          dataTypeID: f.dataTypeID,
        })),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Query execution failed'
      throw new Error(`PostgreSQL error: ${message}`)
    } finally {
      await client.end()
    }
  },
})

export const postgresTools = [postgresExecuteQuery]
