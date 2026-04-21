import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { resolveApiKey } from '../auth/broker'
import { getAllToolsForUser, executeTool } from './tools'
import { AuthRequiredError } from '../errors'
import { logger } from '../logger'

// Max characters in a single tool response to prevent context overflow
const RESPONSE_CHARACTER_LIMIT = 25_000

/**
 * Creates an MCP server instance configured with all available tools for the authenticated user.
 * Uses server.tool() API with annotations and structured error responses.
 */
export async function createMcpServer(apiKey: string): Promise<McpServer> {
  const user = await resolveApiKey(apiKey)
  if (!user) {
    throw new Error('Invalid API key')
  }

  const allTools = await getAllToolsForUser(user.id)

  const server = new McpServer({
    name: 'opentool',
    version: '1.0.0',
  })

  for (const tool of allTools) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(server.tool as any)(
      tool.id,
      tool.description,
      tool.inputZodShape,
      tool.annotations ?? {},
      async (input: Record<string, unknown>) => {
        try {
          const result = await executeTool(tool.id, input, user.id)
          let jsonStr = JSON.stringify(result, null, 2)

          // Truncate oversized responses to prevent context overflow
          if (jsonStr.length > RESPONSE_CHARACTER_LIMIT) {
            const truncated = jsonStr.slice(0, RESPONSE_CHARACTER_LIMIT)
            jsonStr =
              truncated +
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

  return server
}

/**
 * Starts the OpenTool MCP server listening on stdio.
 */
export async function startStdioServer(apiKey: string): Promise<void> {
  const server = await createMcpServer(apiKey)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  logger.info('OpenTool MCP server started')
}
