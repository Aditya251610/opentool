import { prisma } from '../db/client'
import { getToolById, getAllTools } from '../registry'
import { getTokenForUser } from '../auth/broker'
import { AuthContext, ToolDefinition } from '@opentool/tool-schema'

export interface ConnectedTool {
  id: string
  description: string
  inputJsonSchema: Record<string, unknown>
}

export async function getConnectedTools(userId: string): Promise<ConnectedTool[]> {
  const connections = await prisma.toolConnection.findMany({
    where: { userId, status: 'CONNECTED' },
    include: { provider: { select: { provider: true } } },
  })

  const connectedProviders = new Set(connections.map((c) => c.provider.provider))
  const tools = getAllTools()

  return tools
    .filter((t) => t.authType === 'none' || connectedProviders.has(t.provider))
    .map((t) => ({
      id: t.id,
      description: t.description,
      inputJsonSchema: t.inputJsonSchema,
    }))
}

export async function executeTool(
  toolId: string,
  input: Record<string, unknown>,
  userId: string
): Promise<unknown> {
  const tool: ToolDefinition | undefined = getToolById(toolId)
  if (!tool) throw new Error(`Unknown tool: ${toolId}`)

  const auth: AuthContext = { userId }

  if (tool.authType === 'oauth2') {
    const tokenData = await getTokenForUser(userId, tool.provider)
    if (!tokenData) {
      throw new Error(`Not connected to ${tool.provider}. Please authenticate first.`)
    }
    auth.accessToken = tokenData.accessToken
  }

  return tool.execute({ input, auth })
}
