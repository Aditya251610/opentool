import { z, ZodSchema } from 'zod'

export type AuthType = 'oauth2' | 'api_key' | 'none'

export interface AuthContext {
  accessToken?: string
  apiKey?: string
  userId: string
}

export interface ToolExecuteParams<TInput> {
  input: TInput
  auth: AuthContext
}

export interface ToolDefinitionConfig<TInput> {
  id: string                          // "github.create_issue"
  name: string                        // "Create GitHub Issue"
  description: string
  provider: string                    // "github"
  authType: AuthType
  requiredScopes?: string[]
  inputSchema: ZodSchema<TInput>
  execute: (params: ToolExecuteParams<TInput>) => Promise<unknown>
}

export interface ToolDefinition<TInput = unknown> {
  id: string
  name: string
  description: string
  provider: string
  authType: AuthType
  requiredScopes: string[]
  inputSchema: ZodSchema<TInput>
  inputJsonSchema: Record<string, unknown>
  execute: (params: ToolExecuteParams<TInput>) => Promise<unknown>
}

export function defineTool<TInput>(
  config: ToolDefinitionConfig<TInput>
): ToolDefinition<TInput> {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    provider: config.provider,
    authType: config.authType,
    requiredScopes: config.requiredScopes ?? [],
    inputSchema: config.inputSchema,
    inputJsonSchema: zodToJsonSchema(config.inputSchema),
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