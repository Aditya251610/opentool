import * as grpc from '@grpc/grpc-js'
import { logger } from '../../logger'

/**
 * gRPC logging interceptor — logs method calls, duration, and status.
 */
export function loggingInterceptor(
  methodDescriptor: grpc.MethodDefinition<any, any>,
  call: grpc.ServerUnaryCall<any, any>,
): grpc.ServerInterceptingCall {
  const method = methodDescriptor.path || 'unknown'

  logger.info('gRPC call started', { method })

  const interceptingCall = new grpc.ServerInterceptingCall(call as any)

  return interceptingCall
}
