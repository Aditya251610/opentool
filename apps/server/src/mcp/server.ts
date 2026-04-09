import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { resolveApiKey } from '../auth/broker'
import { getAllToolsForUser, executeTool } from './tools'
import { AuthRequiredError } from '../errors'
import { logger } from '../logger'

/**
 * Creates an MCP server instance configured with all available tools for the authenticated user.
 * Registers tool handlers that resolve auth context and execute tools on demand, with built-in
 * error handling for missing API key configurations.
 * @param apiKey - The user's API key to authenticate and load their configured tools
 * @returns Configured MCP Server instance ready to connect via transport
 * @throws Error if the API key is invalid
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
    server.tool(
      tool.id,
      tool.description,
      tool.inputZodShape,
      async (input: Record<string, unknown>) => {
        try {
          const result = await executeTool(tool.id, input, user.id)
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }]
          }
        } catch (error) {
          if (error instanceof AuthRequiredError) {
            const message = error.authType === 'api_key'
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
              content: [{ type: 'text', text: message }]
            }
          }
          throw error
        }
      }
    )
  }

  return server
}

/**
 * Starts the OpenTool MCP server listening on stdio.
 * Creates an authenticated server instance and connects it to a stdio transport
 * for communication with stdio clients.
 * @param apiKey - The user's API key to authenticate the server
 * @returns Promise that resolves when the server is connected and ready
 */
export async function startStdioServer(apiKey: string): Promise<void> {
  const server = await createMcpServer(apiKey)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  logger.info('OpenTool MCP server started')
}