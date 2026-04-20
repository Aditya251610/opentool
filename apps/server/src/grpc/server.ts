import * as grpc from '@grpc/grpc-js'
import * as fs from 'node:fs'
import {
  getToolServiceDefinition,
  getHealthServiceDefinition,
  getAuthServiceDefinition,
  getMcpTransportDefinition,
} from '@opentool/proto'
import { toolServiceImpl } from './services/tool-service'
import { healthServiceImpl, shutdownHealthService } from './services/health-service'
import { mcpBridgeServiceImpl, closeAllGrpcMcpSessions } from './services/mcp-bridge-service'
import { logger } from '../logger'

export interface GrpcServerConfig {
  port: number
  tlsCert?: string // Path to TLS certificate
  tlsKey?: string // Path to TLS private key
  tlsCa?: string // Path to CA cert for mTLS
  maxStreams?: number // Max concurrent streams per connection
  reflection?: boolean // Enable gRPC reflection
}

let grpcServer: grpc.Server | null = null

/**
 * Creates and starts the gRPC server.
 * Runs alongside the existing HTTP server on a separate port.
 */
export async function startGrpcServer(config: GrpcServerConfig): Promise<grpc.Server> {
  const server = new grpc.Server({
    'grpc.max_concurrent_streams': config.maxStreams ?? 100,
    'grpc.keepalive_time_ms': 30_000,
    'grpc.keepalive_timeout_ms': 5_000,
    'grpc.keepalive_permit_without_calls': 1,
    'grpc.max_connection_age_ms': 5 * 60 * 1000, // 5 min
    'grpc.max_connection_age_grace_ms': 30_000, // 30s grace
  })

  // Register services
  server.addService(getToolServiceDefinition(), toolServiceImpl)
  server.addService(getHealthServiceDefinition(), healthServiceImpl)
  server.addService(getMcpTransportDefinition(), mcpBridgeServiceImpl)

  // Determine credentials
  let credentials: grpc.ServerCredentials
  if (config.tlsCert && config.tlsKey) {
    const cert = fs.readFileSync(config.tlsCert)
    const key = fs.readFileSync(config.tlsKey)

    if (config.tlsCa) {
      // Mutual TLS — require client certificates
      const ca = fs.readFileSync(config.tlsCa)
      credentials = grpc.ServerCredentials.createSsl(
        ca,
        [{ cert_chain: cert, private_key: key }],
        true,
      )
      logger.info('gRPC server using mutual TLS')
    } else {
      // Server-side TLS only
      credentials = grpc.ServerCredentials.createSsl(
        null,
        [{ cert_chain: cert, private_key: key }],
        false,
      )
      logger.info('gRPC server using TLS')
    }
  } else {
    credentials = grpc.ServerCredentials.createInsecure()
    logger.info('gRPC server using insecure credentials (development mode)')
  }

  // Bind and start
  return new Promise((resolve, reject) => {
    server.bindAsync(`0.0.0.0:${config.port}`, credentials, (err, boundPort) => {
      if (err) {
        logger.error('gRPC server failed to bind', { error: err.message, port: config.port })
        reject(err)
        return
      }

      grpcServer = server
      logger.info('⚡ gRPC server running', { port: boundPort })
      resolve(server)
    })
  })
}

/**
 * Gracefully shuts down the gRPC server.
 * Drains active calls before closing.
 */
export async function shutdownGrpcServer(): Promise<void> {
  if (!grpcServer) return

  logger.info('Shutting down gRPC server...')
  await shutdownHealthService()
  await closeAllGrpcMcpSessions()

  return new Promise<void>((resolve) => {
    grpcServer!.tryShutdown((err) => {
      if (err) {
        logger.error('gRPC graceful shutdown failed, forcing', { error: err.message })
        grpcServer!.forceShutdown()
      }
      grpcServer = null
      logger.info('gRPC server stopped')
      resolve()
    })
  })
}

/**
 * Returns whether the gRPC server is currently running.
 */
export function isGrpcServerRunning(): boolean {
  return grpcServer !== null
}
