import type {
  ExecuteToolResponse,
  ExecuteToolProgress,
  ListToolsResponse,
  ToolSchema,
  HealthCheckResponse,
} from './types'

/**
 * gRPC transport client for the OpenTool SDK.
 *
 * **Node.js only** — requires `@grpc/grpc-js` and `@opentool/proto` as peer dependencies.
 * These are dynamically imported on first use to keep the main SDK bundle light.
 *
 * @example
 * ```ts
 * import { GrpcTransport } from '@opentool-ts/sdk'
 *
 * const transport = new GrpcTransport({
 *   host: 'localhost:50051',
 *   apiKey: 'ot_your_key_here',
 * })
 *
 * const tools = await transport.listTools()
 *
 * for await (const progress of transport.executeStream('github.create_issue', { owner: 'user' })) {
 *   console.log(progress.status, progress.progressMessage)
 * }
 * ```
 */
export interface GrpcTransportConfig {
  host: string
  apiKey?: string
  tls?: boolean
  caCert?: string
  clientCert?: string
  clientKey?: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export class GrpcTransport {
  private config: GrpcTransportConfig
  private toolClient: any = null
  private healthClient: any = null
  private grpcMod: any = null

  constructor(config: GrpcTransportConfig) {
    this.config = config
  }

  private async init(): Promise<void> {
    if (this.toolClient) return

    // Dynamic imports — peer deps, not bundled
    const proto: any = await import('@opentool/proto')
    this.grpcMod = proto.grpc

    let creds: any
    if (this.config.tls || this.config.caCert) {
      const fs: any = await import('node:fs')
      const root = this.config.caCert ? fs.readFileSync(this.config.caCert) : null
      const cert = this.config.clientCert ? fs.readFileSync(this.config.clientCert) : null
      const key = this.config.clientKey ? fs.readFileSync(this.config.clientKey) : null
      creds =
        cert && key
          ? this.grpcMod.credentials.createSsl(root, key, cert)
          : this.grpcMod.credentials.createSsl(root)
    } else {
      creds = this.grpcMod.credentials.createInsecure()
    }

    this.toolClient = new proto.ToolServiceClient(this.config.host, creds)
    this.healthClient = new proto.HealthClient(this.config.host, creds)
  }

  private meta(): any {
    const m = new this.grpcMod.Metadata()
    if (this.config.apiKey) m.set('authorization', `Bearer ${this.config.apiKey}`)
    return m
  }

  setApiKey(key: string): void {
    this.config.apiKey = key
  }
  clearApiKey(): void {
    this.config.apiKey = undefined
  }

  async listTools(
    opts: { provider?: string; connectedOnly?: boolean } = {},
  ): Promise<ListToolsResponse> {
    await this.init()
    return new Promise((resolve, reject) => {
      this.toolClient.ListTools(
        { provider: opts.provider || '', connectedOnly: opts.connectedOnly || false },
        this.meta(),
        (e: any, r: ListToolsResponse) => (e ? reject(e) : resolve(r)),
      )
    })
  }

  async executeTool(
    toolId: string,
    input: Record<string, unknown> = {},
    timeoutMs?: number,
  ): Promise<ExecuteToolResponse> {
    await this.init()
    return new Promise((resolve, reject) => {
      this.toolClient.ExecuteTool(
        { toolId, inputJson: JSON.stringify(input), timeoutMs: timeoutMs || 0 },
        this.meta(),
        (e: any, r: ExecuteToolResponse) => (e ? reject(e) : resolve(r)),
      )
    })
  }

  async *executeStream(
    toolId: string,
    input: Record<string, unknown> = {},
    timeoutMs?: number,
  ): AsyncGenerator<ExecuteToolProgress> {
    await this.init()
    const stream = this.toolClient.ExecuteToolStream(
      { toolId, inputJson: JSON.stringify(input), timeoutMs: timeoutMs || 0 },
      this.meta(),
    )

    const buf: ExecuteToolProgress[] = []
    let wake: (() => void) | null = null
    let done = false
    let err: any = null

    stream.on('data', (d: ExecuteToolProgress) => {
      buf.push(d)
      wake?.()
      wake = null
    })
    stream.on('error', (e: any) => {
      err = e
      done = true
      wake?.()
      wake = null
    })
    stream.on('end', () => {
      done = true
      wake?.()
      wake = null
    })

    while (true) {
      if (buf.length > 0) {
        yield buf.shift()!
        continue
      }
      if (done) {
        if (err) throw err
        return
      }
      await new Promise<void>((r) => {
        wake = r
      })
    }
  }

  async getToolSchema(toolId: string): Promise<ToolSchema> {
    await this.init()
    return new Promise((resolve, reject) => {
      this.toolClient.GetToolSchema({ toolId }, this.meta(), (e: any, r: ToolSchema) =>
        e ? reject(e) : resolve(r),
      )
    })
  }

  async health(): Promise<HealthCheckResponse> {
    await this.init()
    return new Promise((resolve, reject) => {
      this.healthClient.Check({ service: '' }, (e: any, r: HealthCheckResponse) =>
        e ? reject(e) : resolve(r),
      )
    })
  }

  close(): void {
    this.toolClient?.close()
    this.toolClient = null
    this.healthClient?.close()
    this.healthClient = null
    this.grpcMod = null
  }
}
