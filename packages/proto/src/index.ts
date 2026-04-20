import * as path from 'node:path'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

const PROTO_DIR = path.join(__dirname, '..', 'opentool', 'v1')

const LOADER_OPTIONS: protoLoader.Options = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [path.join(__dirname, '..')],
}

function loadProto(filename: string): grpc.GrpcObject {
  const protoPath = path.join(PROTO_DIR, filename)
  const packageDefinition = protoLoader.loadSync(protoPath, LOADER_OPTIONS)
  return grpc.loadPackageDefinition(packageDefinition)
}

// Load all service definitions
const toolProto = loadProto('tool_service.proto')
const authProto = loadProto('auth_service.proto')
const healthProto = loadProto('health.proto')
const mcpProto = loadProto('mcp_transport.proto')

// Extract service constructors from the loaded packages
function getService(proto: grpc.GrpcObject, path: string): grpc.ServiceClientConstructor {
  const parts = path.split('.')
  let current: any = proto
  for (const part of parts) {
    current = current[part]
    if (!current) {
      throw new Error(`Service not found at path: ${path}`)
    }
  }
  return current
}

// Service client constructors — use these to create gRPC clients
export const ToolServiceClient = getService(toolProto, 'opentool.v1.ToolService')
export const AuthServiceClient = getService(authProto, 'opentool.v1.AuthService')
export const HealthClient = getService(healthProto, 'opentool.v1.Health')
export const McpTransportClient = getService(mcpProto, 'opentool.v1.McpTransport')

// Service definitions — use these to implement gRPC servers
export function getToolServiceDefinition(): grpc.ServiceDefinition {
  return (ToolServiceClient as any).service
}

export function getAuthServiceDefinition(): grpc.ServiceDefinition {
  return (AuthServiceClient as any).service
}

export function getHealthServiceDefinition(): grpc.ServiceDefinition {
  return (HealthClient as any).service
}

export function getMcpTransportDefinition(): grpc.ServiceDefinition {
  return (McpTransportClient as any).service
}

// Proto directory path (for tools that need raw .proto files)
export const PROTO_PATH = PROTO_DIR

// Re-export grpc for convenience
export { grpc }

// ─── TypeScript types matching proto messages ───

export interface Tool {
  id: string
  name: string
  description: string
  provider: string
  authType: string
  connected: boolean
  requiredScopes: string[]
}

export interface ToolSchema {
  toolId: string
  inputJsonSchema: string
  description: string
}

export interface ToolContent {
  type: string
  text: string
}

export interface ErrorDetail {
  code: number
  message: string
  metadata: Record<string, string>
}

export interface ListToolsRequest {
  provider: string
  connectedOnly: boolean
}

export interface ListToolsResponse {
  tools: Tool[]
  totalCount: number
}

export interface ExecuteToolRequest {
  toolId: string
  inputJson: string
  timeoutMs: number
}

export interface ExecuteToolResponse {
  content: ToolContent[]
  isError: boolean
  durationMs: number
}

export interface ExecuteToolProgress {
  status: string
  content: ToolContent[]
  progressMessage: string
  error: ErrorDetail | null
  elapsedMs: number
  progressPercent: number
}

export interface BatchExecuteRequest {
  requests: ExecuteToolRequest[]
  maxConcurrency: number
}

export interface BatchExecuteProgress {
  requestIndex: number
  toolId: string
  status: string
  content: ToolContent[]
  error: ErrorDetail | null
  durationMs: number
}

export interface ValidateKeyRequest {
  apiKey: string
}

export interface ValidateKeyResponse {
  valid: boolean
  keyInfo: { userId: string; keyPrefix: string; name: string } | null
  errorMessage: string
}

export interface HealthCheckRequest {
  service: string
}

export interface HealthCheckResponse {
  status: string
  detail: {
    databaseOk: boolean
    redisOk: boolean
    timestamp: string
    serverVersion: string
  } | null
}

export interface McpMessage {
  jsonRpcPayload: string
  sessionId: string
  type: string
}
