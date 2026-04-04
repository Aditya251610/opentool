import { HttpClient } from '../http'
import type { ApiKey, ApiKeyCreated, CreateKeyInput } from '../types'

export class KeysResource {
  constructor(private http: HttpClient) {}

  /** List all active (non-revoked) API keys. */
  async list(): Promise<ApiKey[]> {
    const res = await this.http.get<{ keys: ApiKey[] }>('/api/keys/')
    return res.keys
  }

  /** Create a new API key. The raw key is only returned once — store it. */
  async create(input: CreateKeyInput): Promise<ApiKeyCreated> {
    return this.http.post<ApiKeyCreated>('/api/keys/', input)
  }

  /** Revoke an API key by ID. Irreversible. */
  async revoke(id: string): Promise<void> {
    await this.http.delete(`/api/keys/${id}`)
  }
}
