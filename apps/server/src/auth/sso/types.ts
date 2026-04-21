// SSO Provider Interface — abstraction over SAML and OIDC flows

export interface SsoUserProfile {
  email: string
  name?: string
  idpUserId: string
  idpSessionId: string
  groups?: string[]
}

export interface SsoProviderConfig {
  // SAML
  entryPoint?: string
  issuer?: string
  cert?: string
  // OIDC
  clientId?: string
  clientSecret?: string
  discoveryUrl?: string
  // Common
  callbackUrl: string
}

export interface SsoProvider {
  /** Generate the login redirect URL */
  getLoginUrl(state: string): Promise<string>
  /** Validate callback and extract user profile */
  validateCallback(params: Record<string, string>): Promise<SsoUserProfile>
  /** Verify the provider config is valid (test connection) */
  testConnection(): Promise<{ success: boolean; error?: string }>
}

export type SsoProviderType =
  | 'GOOGLE_WORKSPACE'
  | 'OKTA'
  | 'AZURE_AD'
  | 'CUSTOM_SAML'
  | 'CUSTOM_OIDC'
