import * as grpc from '@grpc/grpc-js'
import { resolveApiKey } from '../../auth/broker'
import { logger } from '../../logger'

export interface AuthenticatedCall extends grpc.ServerUnaryCall<any, any> {
  userId?: string
}

/**
 * Extracts API key from gRPC metadata `authorization` field.
 * Supports: "Bearer <token>", "Bearer Bearer <token>" (double prefix), raw token.
 */
function extractApiKey(metadata: grpc.Metadata): string | null {
  const values = metadata.get('authorization')
  if (!values || values.length === 0) return null

  let token = values[0]?.toString() ?? ''
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim()
  }
  // Handle double Bearer prefix
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim()
  }
  return token || null
}

/**
 * gRPC server interceptor that validates API keys.
 * Attaches userId to the call for downstream handlers.
 */
export function authInterceptor(
  methodDescriptor: grpc.MethodDefinition<any, any>,
  call: grpc.ServerUnaryCall<any, any> | grpc.ServerWritableStream<any, any>,
): grpc.ServerInterceptingCall {
  const listener = new grpc.ServerListenerBuilder()

  const interceptingCall = new grpc.ServerInterceptingCall(call as any)

  // Check for methods that don't require auth
  const fullMethod = methodDescriptor.path || ''
  const publicMethods = ['/opentool.v1.Health/Check', '/opentool.v1.Health/Watch']
  if (publicMethods.includes(fullMethod)) {
    return interceptingCall
  }

  // Validate auth on message receipt
  listener.withOnReceiveMessage((message, next) => {
    const apiKey = extractApiKey(call.metadata)
    if (!apiKey) {
      interceptingCall.sendStatus({
        code: grpc.status.UNAUTHENTICATED,
        details: 'Missing or invalid Bearer token in authorization metadata',
      })
      return
    }

    resolveApiKey(apiKey)
      .then((user) => {
        if (!user) {
          interceptingCall.sendStatus({
            code: grpc.status.UNAUTHENTICATED,
            details: 'Invalid API key',
          })
          return
        }

        // Attach userId to metadata for downstream handlers
        call.metadata.set('x-user-id', user.id)
        ;(call as AuthenticatedCall).userId = user.id
        next(message)
      })
      .catch((err) => {
        logger.error('gRPC auth interceptor error', err)
        interceptingCall.sendStatus({
          code: grpc.status.INTERNAL,
          details: 'Authentication service error',
        })
      })
  })

  return interceptingCall
}

/**
 * Extracts userId from an authenticated gRPC call.
 * Must be used after authInterceptor.
 */
export function getUserId(
  call:
    | grpc.ServerUnaryCall<any, any>
    | grpc.ServerWritableStream<any, any>
    | grpc.ServerDuplexStream<any, any>,
): string {
  // Try from call property first (set by interceptor)
  const authCall = call as AuthenticatedCall
  if (authCall.userId) return authCall.userId

  // Fallback to metadata
  const values = call.metadata.get('x-user-id')
  if (values && values.length > 0) return values[0].toString()

  throw new Error('User ID not found — auth interceptor may not have run')
}
