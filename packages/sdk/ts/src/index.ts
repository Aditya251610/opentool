export { OpenTool } from './client'
export { GrpcTransport, type GrpcTransportConfig } from './grpc'

export type {
  OpenToolConfig,
  User,
  UserProfile,
  AuthResponse,
  ApiKey,
  ApiKeyCreated,
  Tool,
  ToolList,
  ToolExecutionResult,
  ConnectUrl,
  HealthStatus,
  SignupInput,
  LoginInput,
  CreateKeyInput,
  UpdateProfileInput,
  ExecuteToolInput,
  // gRPC types
  ExecuteToolResponse,
  ExecuteToolProgress,
  ListToolsResponse,
  ToolSchema,
  HealthCheckResponse,
} from './types'

export { OpenToolError, AuthenticationError, NotFoundError } from './types'
