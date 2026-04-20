import * as grpc from '@grpc/grpc-js'
import { logger } from '../../logger'

/**
 * gRPC logging interceptor — logs method calls, duration, and status.
 */
export function loggingInterceptor(
  methodDescriptor: grpc.MethodDefinition<any, any>,
  call: grpc.ServerUnaryCall<any, any>,
): grpc.ServerInterceptingCall {
  const startTime = Date.now()
  const method = methodDescriptor.path || 'unknown'

  logger.info('gRPC call started', { method })

  const interceptingCall = new grpc.ServerInterceptingCall(call as any)

  const responder = new grpc.ResponderBuilder()
    .withSendStatus((status, next) => {
      const duration = Date.now() - startTime
      const level = status.code === grpc.status.OK ? 'info' : 'warn'
      logger[level]('gRPC call completed', {
        method,
        code: status.code,
        duration: `${duration}ms`,
      })
      next(status)
    })
    .build()

  return interceptingCall
}
