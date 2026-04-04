import {
  OpenToolConfig,
  OpenToolError,
  AuthenticationError,
} from './types'

export class HttpClient {
  private baseUrl: string
  private apiKey?: string
  private _fetch: typeof globalThis.fetch
  private timeout: number

  constructor(config: OpenToolConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    this.apiKey = config.apiKey
    this._fetch = config.fetch ?? globalThis.fetch
    this.timeout = config.timeout ?? 30_000
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
        try { parsed = JSON.parse(text) } catch { parsed = text }

        if (res.status === 401) throw new AuthenticationError()
        throw new OpenToolError(
          `${method} ${path} failed: ${res.status}`,
          res.status,
          parsed,
        )
      }

      const text = await res.text()
      return text ? JSON.parse(text) as T : {} as T
    } finally {
      clearTimeout(timer)
    }
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
