import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { resolveApiKey } from '../auth/broker'
import { getAllToolsForUser, executeTool, getMetaToolsForUser } from './tools'
import { AuthRequiredError } from '../errors'
import { logger } from '../logger'

// Max characters in a single tool response to prevent context overflow
const RESPONSE_CHARACTER_LIMIT = 25_000

/**
 * Truncate a result object at the array level to prevent invalid JSON from string slicing.
 * If the result contains arrays, limits items to fit within the character budget.
 */
function truncateResult(result: unknown, limit: number): unknown {
  if (typeof result !== 'object' || result === null) return result
  const obj = result as Record<string, unknown>
  const out: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value) && value.length > 0) {
      // Binary search for max items that fit
      let lo = 0,
        hi = value.length
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2)
        const test = JSON.stringify({ ...obj, [key]: value.slice(0, mid) })
        if (test.length <= limit) lo = mid
        else hi = mid - 1
      }
      out[key] = value.slice(0, Math.max(lo, 1))
      if (lo < value.length) {
        out[`${key}_truncated`] = true
        out[`${key}_total`] = value.length
      }
    } else {
      out[key] = value
    }
  }
  return out
}

export type McpSessionMode = 'lean' | 'full'

/**
 * Creates an MCP server instance.
 * - **lean** mode: registers only 3 meta-tools (search_tools, get_tool_details, execute_dynamic_tool).
 *   Agents discover and execute tools dynamically — ~85% context savings.
 * - **full** mode: registers all tools upfront (backward compatible).
 */
export async function createMcpServer(
  apiKey: string,
  mode: McpSessionMode = (process.env.OPENTOOL_DEFAULT_MODE as McpSessionMode) || 'lean',
): Promise<McpServer> {
  const user = await resolveApiKey(apiKey)
  if (!user) {
    throw new Error('Invalid API key')
  }

  const tools =
    mode === 'lean' ? await getMetaToolsForUser(user.id) : await getAllToolsForUser(user.id)

  const server = new McpServer({
    name: 'opentool',
    version: '1.0.0',
  })

  for (const tool of tools) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(server.tool as any)(
      tool.id,
      tool.description,
      tool.inputZodShape,
      tool.annotations ?? {},
      async (input: Record<string, unknown>) => {
        try {
          const result = await executeTool(tool.id, input, user.id)

          // Truncate oversized responses at object level to preserve valid JSON
          let jsonStr: string
          if (typeof result === 'object' && result !== null) {
            const limited = truncateResult(result, RESPONSE_CHARACTER_LIMIT)
            jsonStr = JSON.stringify(limited, null, 2)
          } else {
            jsonStr = JSON.stringify(result, null, 2)
          }

          if (jsonStr.length > RESPONSE_CHARACTER_LIMIT) {
            jsonStr =
              jsonStr.slice(0, RESPONSE_CHARACTER_LIMIT) +
              `\n\n...[Response truncated at ${RESPONSE_CHARACTER_LIMIT} characters. Use pagination or filters to narrow results.]`
          }

          return {
            content: [{ type: 'text' as const, text: jsonStr }],
          }
        } catch (error) {
          if (error instanceof AuthRequiredError) {
            const message =
              error.authType === 'api_key'
                ? [
                    `🔐 **Authentication Required**\n`,
                    `To use **${tool.id}**, you need to configure your **${error.provider}** API key.\n`,
                    `👉 Go to your dashboard to set it up:`,
                    error.authUrl,
                    `\nOnce configured, try this tool again.`,
                  ].join('\n')
                : [
                    `🔐 **Authentication Required**\n`,
                    `To use **${tool.id}**, you need to connect your **${error.provider}** account.\n`,
                    `👉 Click here to authenticate:`,
                    error.authUrl,
                    `\nAfter authenticating, retry this tool — it will work immediately.`,
                  ].join('\n')

            return {
              isError: true,
              content: [{ type: 'text' as const, text: message }],
            }
          }

          // Return structured error instead of throwing
          const errMsg = error instanceof Error ? error.message : 'Unknown error'
          logger.error('Tool execution failed', { toolId: tool.id, error: errMsg })
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Error executing ${tool.id}: ${errMsg}. Check your inputs and try again.`,
              },
            ],
          }
        }
      },
    )
  }

  logger.info('MCP server created', { mode, toolCount: tools.length })
  return server
}

/**
 * Starts the OpenTool MCP server listening on stdio.
 */
export async function startStdioServer(apiKey: string): Promise<void> {
  const server = await createMcpServer(apiKey, 'full') // stdio always uses full mode
  const transport = new StdioServerTransport()
  await server.connect(transport)
  logger.info('OpenTool MCP server started')
}
