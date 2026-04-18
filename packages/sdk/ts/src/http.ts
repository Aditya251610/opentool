import { OpenToolConfig, OpenToolError, AuthenticationError } from './types'

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])
const MAX_RETRIES = 3
const BASE_DELAY_MS = 500

function jitter(ms: number): number {
  return ms + Math.random() * ms * 0.5
}

export class HttpClient {
  private baseUrl: string
  private apiKey?: string
  private _fetch: typeof globalThis.fetch
  private timeout: number
  private maxRetries: number

  constructor(config: OpenToolConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    this.apiKey = config.apiKey
    this._fetch = config.fetch ?? globalThis.fetch
    this.timeout = config.timeout ?? 30_000
    this.maxRetries = config.maxRetries ?? MAX_RETRIES
  }

  setApiKey(key: string) {
    this.apiKey = key
  }

  clearApiKey() {
    this.apiKey = undefined
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`
    if (extra) Object.assign(h, extra)
    return h
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    let lastError: unknown

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeout)

      try {
        const res = await this._fetch(url, {
          method,
          headers: this.headers(),
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          let parsed: unknown
          try {
            parsed = JSON.parse(text)
          } catch {
            parsed = text
          }

          if (res.status === 401) throw new AuthenticationError()

          // Retry on transient errors
          if (RETRYABLE_STATUS.has(res.status) && attempt < this.maxRetries) {
            const retryAfter = res.headers.get('retry-after')
            const delay = retryAfter
              ? parseInt(retryAfter, 10) * 1000 || BASE_DELAY_MS
              : jitter(BASE_DELAY_MS * Math.pow(2, attempt))
            await new Promise((r) => setTimeout(r, delay))
            continue
          }

          throw new OpenToolError(`${method} ${path} failed: ${res.status}`, res.status, parsed)
        }

        const text = await res.text()
        return text ? (JSON.parse(text) as T) : ({} as T)
      } catch (err) {
        lastError = err
        if (err instanceof AuthenticationError || err instanceof OpenToolError) throw err
        // Retry on network/timeout errors
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, jitter(BASE_DELAY_MS * Math.pow(2, attempt))))
          continue
        }
        throw err
      } finally {
        clearTimeout(timer)
      }
    }

    throw lastError
  }

  get<T>(path: string) {
    return this.request<T>('GET', path)
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body)
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body)
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path)
  }
}
