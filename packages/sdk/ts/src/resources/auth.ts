import { HttpClient } from '../http'
import type { AuthResponse, SignupInput, LoginInput, ConnectUrl } from '../types'

export class AuthResource {
  constructor(private http: HttpClient) {}

  /** Create a new account. Returns user + raw API key. Auto-sets the key on this client. */
  async signup(input: SignupInput): Promise<AuthResponse> {
    const res = await this.http.post<AuthResponse>('/api/auth/signup', input)
    this.http.setApiKey(res.apiKey)
    return res
  }

  /** Log in with email + password. Returns user + raw API key. Auto-sets the key on this client. */
  async login(input: LoginInput): Promise<AuthResponse> {
    const res = await this.http.post<AuthResponse>('/api/auth/login', input)
    this.http.setApiKey(res.apiKey)
    return res
  }

  /** Get the OAuth URL for a provider. User visits this URL to authorize. */
  async getConnectUrl(provider: string): Promise<string> {
    const res = await this.http.get<ConnectUrl>(`/api/auth/connect-url/${provider}`)
    return res.url
  }

  /** Disconnect (revoke) a provider. */
  async disconnect(provider: string): Promise<void> {
    await this.http.delete(`/api/auth/revoke/${provider}`)
  }
}
