import { prisma } from '../db/client'
import { getToolById } from '../registry'
import { refreshTokenIfExpired } from '../auth/broker'
import { ConnectionStatus, AuditAction, AuditStatus } from '@prisma/client'
import { AuthContext, ToolDefinition } from '@opentool/tool-schema'

export interface ConnectedTool {
  id: string
  description: string
  inputJsonSchema: Record<string, unknown>
  inputZodShape: Record<string, unknown>
}

export async function getConnectedTools(userId: string): Promise<ConnectedTool[]> {
  const connections = await prisma.toolConnection.findMany({
    where: { userId, status: ConnectionStatus.CONNECTED },
    include: { provider: { select: { provider: true } } },
  })

  const connectedProviders = new Set(connections.map((c) => c.provider.provider))
  const allTools = (await import('../registry')).getAllTools()

  return allTools
    .filter((t) => t.authType === 'none' || connectedProviders.has(t.provider))
    .map((t) => ({
      id: t.id,
      description: t.description,
      inputJsonSchema: t.inputJsonSchema,
      inputZodShape: (t.inputSchema as any)._def.shape(),
    }))
}

export async function executeTool(
  toolId: string,
  input: unknown,
  userId: string
): Promise<unknown> {
  const tool: ToolDefinition<any> | undefined = getToolById(toolId)
  if (!tool) throw new Error(`Unknown tool: ${toolId}`)

  const auth: AuthContext = { userId }

  if (tool.authType === 'oauth2') {
    const tokenData = await refreshTokenIfExpired(userId, tool.provider)
    if (!tokenData) {
      throw new Error(`Not connected to ${tool.provider}. Please authenticate first.`)
    }
    auth.accessToken = tokenData.accessToken

    // Fetch provider-specific metadata (e.g. Vercel team_id)
    const conn = await prisma.toolConnection.findFirst({
      where: { userId, provider: { provider: tool.provider } },
      include: { tokenStore: { select: { rawMetadata: true } } },
    })
    if (conn?.tokenStore?.rawMetadata) {
      auth.metadata = conn.tokenStore.rawMetadata as Record<string, unknown>
    }
  } else if (tool.authType === 'api_key') {
    const tokenData = await refreshTokenIfExpired(userId, tool.provider)
    if (!tokenData) {
      throw new Error(`Not connected to ${tool.provider}. Please provide your API key.`)
    }
    auth.apiKey = tokenData.accessToken
  }

  // get toolDefinition id for audit log
  const toolDef = await prisma.toolDefinition.findUnique({
    where: { toolId },
    select: { id: true },
  })

  let result: unknown

  try {
    result = await tool.execute({ input, auth })
  } catch (error) {
    await prisma.auditLog.create({
      data: {
        userId,
        toolDefinitionId: toolDef?.id,
        action: AuditAction.TOOL_EXECUTE,
        status: AuditStatus.FAILURE,
        inputSnapshot: input as any,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })
    throw error
  }

  await prisma.auditLog.create({
    data: {
      userId,
      toolDefinitionId: toolDef?.id,
      action: AuditAction.TOOL_EXECUTE,
      status: AuditStatus.SUCCESS,
      inputSnapshot: input as any,
    },
  })

  return result
}