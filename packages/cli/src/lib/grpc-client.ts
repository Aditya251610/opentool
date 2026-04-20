/**
 * CLI gRPC client — dynamically loads @opentool-ts/sdk's GrpcTransport.
 * Uses dynamic imports so @grpc/grpc-js is only loaded when --transport grpc is used.
 */

import { loadConfig, deriveGrpcUrl } from './config.js'

let _transport: any = null

export async function getGrpcTransport(): Promise<any> {
  if (_transport) return _transport

  const config = loadConfig()
  if (!config.apiKey) {
    throw new Error('Not authenticated. Run "opentool login" or "opentool set-key <api-key>"')
  }

  const grpcUrl = deriveGrpcUrl(config)

  try {
    // Dynamic import — keeps @grpc/grpc-js out of the main bundle
    const sdk = await Function('return import("@opentool-ts/sdk")')()
    _transport = new sdk.GrpcTransport({
      host: grpcUrl,
      apiKey: config.apiKey,
      tls: false,
    })
    return _transport
  } catch (err: any) {
    if (err?.code === 'ERR_MODULE_NOT_FOUND' || err?.message?.includes('Cannot find')) {
      throw new Error(
        'gRPC dependencies not installed. Run: pnpm add @grpc/grpc-js @opentool/proto',
      )
    }
    throw err
  }
}

export function closeGrpcTransport(): void {
  _transport?.close()
  _transport = null
}

/**
 * Check gRPC server health.
 * Returns { serving, latencyMs } or { serving: false } on error.
 */
export async function checkGrpcHealth(
  grpcUrl?: string,
): Promise<{ serving: boolean; latencyMs: number; status?: string }> {
  const config = loadConfig()
  const url = grpcUrl ?? deriveGrpcUrl(config)

  try {
    const sdk = await Function('return import("@opentool-ts/sdk")')()
    const transport = new sdk.GrpcTransport({
      host: url,
      apiKey: config.apiKey,
      tls: false,
    })

    const start = Date.now()
    const res = await transport.health()
    const latencyMs = Date.now() - start
    transport.close()

    return {
      serving: res.status === 'SERVING' || res.status === 1,
      latencyMs,
      status: String(res.status),
    }
  } catch {
    return { serving: false, latencyMs: 0 }
  }
}
