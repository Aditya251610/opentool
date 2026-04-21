import { prisma } from '../db/client'
import { getToolById, getAllTools, getMetaTools } from '../registry'
import { refreshTokenIfExpired } from '../auth/broker'
import { generateAuthUrl } from '../auth/oauth'
import { ConnectionStatus, AuditAction, AuditStatus } from '@prisma/client'
import { AuthContext, ToolDefinition } from '@opentool/tool-schema'
import { config } from '../config'
import { logger } from '../logger'
import { captureException } from '../error-tracking'
import { AuthRequiredError, ToolNotFoundError } from '../errors'
import { TOOL_TIMEOUT_MS } from '../constants'
import { countToolTokens } from '../analytics/tokenizer'
import { toolExecutions, toolErrors, toolDuration } from '../metrics'

// ─── Types ────────────────────────────────

export interface ConnectedTool {
  id: string
  description: string
  inputJsonSchema: Record<string, unknown>
  inputZodShape: Record<string, unknown>
  annotations: {
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
}

export interface UserTool extends ConnectedTool {
  provider: string
  connected: boolean
}

// ─── Helpers ──────────────────────────────

/** Sensitive keys that should be redacted from logs (case-insensitive, normalized). */
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'key',
  'apikey',
  'api_key',
  'connectionstring',
  'connection_string',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'bearertoken',
  'bearer_token',
  'authorization',
  'credential',
  'credentials',
  'privatekey',
  'private_key',
  'clientsecret',
  'client_secret',
  'authkey',
  'auth_key',
  'dbpassword',
  'db_password',
  'jwt',
  'jwttoken',
  'jwt_token',
  'ssotoken',
  'sso_token',
  'sessiontoken',
  'session_token',
  'webhooksecret',
  'webhook_secret',
  'signingkey',
  'signing_key',
  'hmackey',
  'hmac_key',
  'encryptionkey',
  'encryption_key',
])

/** Normalizes a key for comparison by converting to lowercase and removing hyphens/underscores. */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, '')
}

/** Strips sensitive fields from tool input before writing to the audit log. */
export function sanitizeInput(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return input
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(normalizeKey(key))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeInput(value) // recursive
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

/** Strips sensitive fields from tool output and truncates large strings. */
export function sanitizeOutput(output: unknown): unknown {
  if (typeof output === 'string') {
    return output.length > 10000 ? output.substring(0, 10000) + '...[truncated]' : output
  }
  if (typeof output !== 'object' || output === null) return output
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(output as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(normalizeKey(key))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'string' && value.length > 10000) {
      sanitized[key] = value.substring(0, 10000) + '...[truncated]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeOutput(value) // recursive
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

/** Executes a function with a timeout, rejecting if it takes too long. */
async function executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tool execution timed out')), timeoutMs),
    ),
  ])
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
      annotations: t.annotations,
    }
  })
}

/** Backward-compatible: returns only connected tools. */
export async function getConnectedTools(userId: string): Promise<ConnectedTool[]> {
  const allTools = await getAllToolsForUser(userId)
  return allTools.filter((t) => t.connected)
}

/**
 * Returns only meta-tools (search_tools, get_tool_details, execute_dynamic_tool)
 * for lean mode sessions. These tools don't need provider connections.
 */
export async function getMetaToolsForUser(_userId: string): Promise<UserTool[]> {
  const metaToolDefs = getMetaTools()
  return metaToolDefs.map((t) => ({
    id: t.id,
    description: t.description,
    inputJsonSchema: t.inputJsonSchema,
    inputZodShape: (t.inputSchema as any)._def.shape(),
    provider: t.provider,
    connected: true, // meta-tools are always "connected"
    annotations: t.annotations,
  }))
}

// ─── Tool Execution ───────────────────────

/** Executes a tool on behalf of a user, handling auth and audit logging. */
export async function executeTool(
  toolId: string,
  input: unknown,
  userId: string,
  clientName: string = 'unknown',
): Promise<unknown> {
  const tool: ToolDefinition<any> | undefined = getToolById(toolId)
  if (!tool) throw new ToolNotFoundError(toolId)

  // Validate input against tool's schema before execution
  if (tool.inputSchema) {
    const parsed = tool.inputSchema.safeParse(input)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      throw new Error(`Invalid input for ${toolId}: ${issues}`)
    }
    input = parsed.data
  }

  const auth: AuthContext = { userId, clientName }

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
        'api_key',
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
    result = await executeWithTimeout(() => tool.execute({ input, auth }), TOOL_TIMEOUT_MS)

    // Record successful execution
    const durationSecs = (Date.now() - startTime) / 1000
    toolExecutions.inc({ provider: tool.provider, tool: toolId })
    toolDuration.observe(durationSecs)
  } catch (error) {
    const durationMs = Date.now() - startTime

    // Record tool error
    toolErrors.inc({ provider: tool.provider, tool: toolId })

    // Capture exception for error tracking
    if (error instanceof Error) {
      captureException(error, {
        userId,
        toolId,
        provider: tool.provider,
        operation: 'tool_execute',
      })
    }

    void prisma.auditLog
      .create({
        data: {
          userId,
          toolDefinitionId: toolDef?.id,
          action: AuditAction.TOOL_EXECUTE,
          status: AuditStatus.FAILURE,
          inputSnapshot: sanitizeInput(input) as any,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          durationMs,
          clientName: clientName || null,
        },
      })
      .catch((err) => logger.error('Audit log write failed', err))
    throw error
  }

  const durationMs = Date.now() - startTime

  // Fire-and-forget token counting + enriched audit log
  const tokenData = countToolTokens(tool.inputJsonSchema, input, result, clientName)
  const responseStr = typeof result === 'string' ? result : JSON.stringify(result ?? '')

  void prisma.auditLog
    .create({
      data: {
        userId,
        toolDefinitionId: toolDef?.id,
        action: AuditAction.TOOL_EXECUTE,
        status: AuditStatus.SUCCESS,
        inputSnapshot: sanitizeInput(input) as any,
        durationMs,
        clientName: clientName || null,
        responseSize: responseStr.length,
        inputTokens: tokenData.inputTokens,
        outputTokens: tokenData.outputTokens,
        schemaTokens: tokenData.schemaTokens,
        totalTokens: tokenData.totalTokens,
      },
    })
    .catch((err) => logger.error('Audit log write failed', err))

  return result
}
