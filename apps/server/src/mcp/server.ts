import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { resolveApiKey } from '../auth/broker'
import { getConnectedTools, executeTool } from './tools'

export async function createMcpServer(apiKey: string): Promise<McpServer> {
  const user = await resolveApiKey(apiKey)
  if (!user) {
    throw new Error('Invalid API key')
  }

  const connectedTools = await getConnectedTools(user.id)

  const server = new McpServer({
    name: 'opentool',
    version: '1.0.0',
  })

  for (const tool of connectedTools) {
    server.tool(
      tool.id,
      tool.description,
      tool.inputJsonSchema,
      async (input: Record<string, unknown>) => {
        const result = await executeTool(tool.id, input, user.id)
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }]
        }
      }
    )
  }

  return server
}

export async function startStdioServer(apiKey: string): Promise<void> {
  const server = await createMcpServer(apiKey)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('OpenTool MCP server started')
}