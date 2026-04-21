import { z, ZodSchema } from 'zod'

export type AuthType = 'oauth2' | 'api_key' | 'none'

export type ToolCategory =
  | 'development'
  | 'communication'
  | 'email'
  | 'productivity'
  | 'database'
  | 'payments'
  | 'infrastructure'
  | 'meta'

export interface AuthContext {
  accessToken?: string
  apiKey?: string
  userId: string
  metadata?: Record<string, unknown> // provider-specific (e.g. Vercel team_id)
}

export interface ToolExecuteParams<TInput> {
  input: TInput
  auth: AuthContext
}

export interface ToolAnnotations {
  readOnlyHint?: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  openWorldHint?: boolean
}

export interface ToolDefinitionConfig<TInput> {
  id: string
  name: string
  description: string
  provider: string
  authType: AuthType
  category?: ToolCategory
  requiredScopes?: string[]
  inputSchema: ZodSchema<TInput>
  outputSchema?: ZodSchema
  annotations?: ToolAnnotations
  execute: (params: ToolExecuteParams<TInput>) => Promise<unknown>
}

export interface ToolDefinition<TInput = unknown> {
  id: string
  name: string
  description: string
  provider: string
  authType: AuthType
  category: ToolCategory
  requiredScopes: string[]
  inputSchema: ZodSchema<TInput>
  inputJsonSchema: Record<string, unknown>
  outputSchema?: ZodSchema
  outputJsonSchema?: Record<string, unknown>
  annotations: ToolAnnotations
  execute: (params: ToolExecuteParams<TInput>) => Promise<unknown>
}

const PROVIDER_CATEGORY_MAP: Record<string, ToolCategory> = {
  github: 'development',
  linear: 'development',
  vercel: 'infrastructure',
  slack: 'communication',
  notion: 'productivity',
  gmail: 'email',
  google_calendar: 'productivity',
  resend: 'email',
  stripe: 'payments',
  postgres: 'database',
  meta: 'meta',
}

export function defineTool<TInput>(config: ToolDefinitionConfig<TInput>): ToolDefinition<TInput> {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    provider: config.provider,
    authType: config.authType,
    category: config.category ?? PROVIDER_CATEGORY_MAP[config.provider] ?? 'productivity',
    requiredScopes: config.requiredScopes ?? [],
    inputSchema: config.inputSchema,
    inputJsonSchema: zodToJsonSchema(config.inputSchema),
    outputSchema: config.outputSchema,
    outputJsonSchema: config.outputSchema ? zodToJsonSchema(config.outputSchema) : undefined,
    annotations: config.annotations ?? {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    execute: config.execute,
  }
}

// Minimal zod -> JSON schema converter
// Handles the common cases — string, number, boolean, object, enum
function zodToJsonSchema(schema: ZodSchema): Record<string, unknown> {
  const def = (schema as any)._def

  if (def.typeName === 'ZodObject') {
    const shape = def.shape()
    const properties: Record<string, unknown> = {}
    const required: string[] = []

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as ZodSchema)
      const fieldDef = (value as any)._def
      if (fieldDef.typeName !== 'ZodOptional') {
        required.push(key)
      }
    }

    return { type: 'object', properties, required }
  }

  if (def.typeName === 'ZodString') {
    const result: Record<string, unknown> = { type: 'string' }
    if (def.description) result.description = def.description
    return result
  }

  if (def.typeName === 'ZodNumber') return { type: 'number' }
  if (def.typeName === 'ZodBoolean') return { type: 'boolean' }

  if (def.typeName === 'ZodOptional') {
    return zodToJsonSchema(def.innerType)
  }

  if (def.typeName === 'ZodEnum') {
    return { type: 'string', enum: def.values }
  }

  if (def.typeName === 'ZodArray') {
    return { type: 'array', items: zodToJsonSchema(def.type) }
  }

  return {}
}

export { z }
