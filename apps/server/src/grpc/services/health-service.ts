import * as grpc from '@grpc/grpc-js'
import { prisma } from '../../db/client'
import { redis } from '../../db/redis'
import { logger } from '../../logger'
import type { HealthCheckRequest, HealthCheckResponse } from '@opentool/proto'

/**
 * gRPC Health service implementation.
 * Follows the standard gRPC health checking protocol with OpenTool extensions.
 */
export const healthServiceImpl: grpc.UntypedServiceImplementation = {
  async Check(
    call: grpc.ServerUnaryCall<HealthCheckRequest, HealthCheckResponse>,
    callback: grpc.sendUnaryData<HealthCheckResponse>,
  ) {
    try {
      const [dbResult, redisResult] = await Promise.allSettled([
        prisma.$queryRaw`SELECT 1`,
        redis.ping(),
      ])

      const dbOk = dbResult.status === 'fulfilled'
      const redisOk = redisResult.status === 'fulfilled'
      const serving = dbOk && redisOk

      callback(null, {
        status: serving ? 'SERVING_STATUS_SERVING' : 'SERVING_STATUS_NOT_SERVING',
        detail: {
          databaseOk: dbOk,
          redisOk,
          timestamp: new Date().toISOString(),
          serverVersion: '1.0.0',
        },
      } as HealthCheckResponse)
    } catch (error) {
      logger.error('Health check failed', error)
      callback(null, {
        status: 'SERVING_STATUS_NOT_SERVING',
        detail: {
          databaseOk: false,
          redisOk: false,
          timestamp: new Date().toISOString(),
          serverVersion: '1.0.0',
        },
      } as HealthCheckResponse)
    }
  },

  Watch(call: grpc.ServerWritableStream<HealthCheckRequest, HealthCheckResponse>) {
    // Send initial status
    const sendStatus = async () => {
      try {
        const [dbResult, redisResult] = await Promise.allSettled([
          prisma.$queryRaw`SELECT 1`,
          redis.ping(),
        ])

        const dbOk = dbResult.status === 'fulfilled'
        const redisOk = redisResult.status === 'fulfilled'

        call.write({
          status: dbOk && redisOk ? 'SERVING_STATUS_SERVING' : 'SERVING_STATUS_NOT_SERVING',
          detail: {
            databaseOk: dbOk,
            redisOk,
            timestamp: new Date().toISOString(),
            serverVersion: '1.0.0',
          },
        } as HealthCheckResponse)
      } catch {
        call.write({
          status: 'SERVING_STATUS_NOT_SERVING',
          detail: {
            databaseOk: false,
            redisOk: false,
            timestamp: new Date().toISOString(),
            serverVersion: '1.0.0',
          },
        } as HealthCheckResponse)
      }
    }

    sendStatus()

    // Poll every 30 seconds
    const interval = setInterval(sendStatus, 30_000)

    call.on('cancelled', () => {
      clearInterval(interval)
    })

    call.on('close', () => {
      clearInterval(interval)
    })
  },
}

/** Clean up redis connection on shutdown */
export async function shutdownHealthService(): Promise<void> {
  // Redis is now managed centrally by db/redis.ts — no local cleanup needed
}
