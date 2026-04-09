import { prisma } from '../db/client'
import { getToolById, getAllTools } from '../registry'
import { refreshTokenIfExpired } from '../auth/broker'
import { generateAuthUrl } from '../auth/oauth'
import { ConnectionStatus, AuditAction, AuditStatus } from '@prisma/client'
import { AuthContext, ToolDefinition } from '@opentool/tool-schema'
import { config } from '../config'
import { logger } from '../logger'
import { AuthRequiredError, ToolNotFoundError } from '../errors'

// ─── Types ────────────────────────────────

export interface ConnectedTool {
  id: string
  description: string
  inputJsonSchema: Record<string, unknown>
  inputZodShape: Record<string, unknown>
}

export interface UserTool extends ConnectedTool {
  provider: string
  connected: boolean
}

// ─── Helpers ──────────────────────────────

/** Strips sensitive fields from tool input before writing to the audit log. */
function sanitizeInput(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return input
  const sanitized = { ...input as Record<string, unknown> }
  for (const key of ['password', 'token', 'secret', 'key', 'connectionString']) {
    if (key in sanitized) sanitized[key] = '[REDACTED]'
  }
  return sanitized
}

// ─── Tool Listing ─────────────────────────

/**
 * Returns ALL tools for a user, marking which ones need authentication.
 * Unconnected tools get a 🔐 prefix so the AI agent knows to expect an auth prompt.
 */
export async function getAllToolsForUser(userId: string): Promise<UserTool[]> {
  const connections = await prisma.toolConnection.findMany({
    where: { userId, status: ConnectionStatus.CONNECTED },
    include: { provider: { select: { provider: true } } },
  })

  const connectedProviders = new Set(connections.map((c) => c.provider.provider))
  const allToolDefs = getAllTools()

  return allToolDefs.map((t) => {
    const connected = t.authType === 'none' || connectedProviders.has(t.provider)
    return {
      id: t.id,
      description: connected
        ? t.description
        : `🔐 [Auth Required] ${t.description} — Call this tool to get a sign-in link.`,
      inputJsonSchema: t.inputJsonSchema,
      inputZodShape: (t.inputSchema as any)._def.shape(),
      provider: t.provider,
      connected,
    }
  })
}

/** Backward-compatible: returns only connected tools. */
export async function getConnectedTools(userId: string): Promise<ConnectedTool[]> {
  const allTools = await getAllToolsForUser(userId)
  return allTools.filter((t) => t.connected)
}

// ─── Tool Execution ───────────────────────

/** Executes a tool on behalf of a user, handling auth and audit logging. */
export async function executeTool(
  toolId: string,
  input: unknown,
  userId: string
): Promise<unknown> {
  const tool: ToolDefinition<any> | undefined = getToolById(toolId)
  if (!tool) throw new ToolNotFoundError(toolId)

  const auth: AuthContext = { userId }

  if (tool.authType === 'oauth2') {
    const tokenData = await refreshTokenIfExpired(userId, tool.provider)
    if (!tokenData) {
      // Interactive auth: generate OAuth URL and throw so MCP handler can show it
      try {
        const authUrl = await generateAuthUrl(tool.provider, userId)
        throw new AuthRequiredError(tool.provider, authUrl, 'oauth2')
      } catch (e) {
        if (e instanceof AuthRequiredError) throw e
        // generateAuthUrl itself failed (provider not configured, etc.)
        throw new Error(`Not connected to ${tool.provider}. Please authenticate via the dashboard.`)
      }
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
      // API key providers: direct user to dashboard to configure
      throw new AuthRequiredError(
        tool.provider,
        `${config.dashboardUrl}/dashboard/tools`,
        'api_key'
      )
    }
    auth.apiKey = tokenData.accessToken
  }

  // get toolDefinition id for audit log
  const toolDef = await prisma.toolDefinition.findUnique({
    where: { toolId },
    select: { id: true },
  })

  const startTime = Date.now()
  let result: unknown

  try {
    result = await tool.execute({ input, auth })
  } catch (error) {
    const durationMs = Date.now() - startTime
    void prisma.auditLog.create({
      data: {
        userId,
        toolDefinitionId: toolDef?.id,
        action: AuditAction.TOOL_EXECUTE,
        status: AuditStatus.FAILURE,
        inputSnapshot: sanitizeInput(input) as any,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
      },
    }).catch(err => logger.error('Audit log write failed', err))
    throw error
  }

  const durationMs = Date.now() - startTime
  void prisma.auditLog.create({
    data: {
      userId,
      toolDefinitionId: toolDef?.id,
      action: AuditAction.TOOL_EXECUTE,
      status: AuditStatus.SUCCESS,
      inputSnapshot: sanitizeInput(input) as any,
      durationMs,
    },
  }).catch(err => logger.error('Audit log write failed', err))

  return result
}