import { describe, it, expect } from 'vitest'
import { SamlProvider } from '../saml.js'
import { OidcProvider } from '../oidc.js'
import { createSsoProvider } from '../index.js'
import type { SsoProviderConfig } from '../types.js'

describe('SSO Providers', () => {
  const baseConfig: SsoProviderConfig = {
    callbackUrl: 'https://app.opentool.dev/api/orgs/acme/sso/callback',
  }

  describe('SamlProvider', () => {
    it('generates login URL with SAMLRequest param', async () => {
      const provider = new SamlProvider({
        ...baseConfig,
        entryPoint: 'https://idp.example.com/sso/saml',
        issuer: 'https://app.opentool.dev',
        cert: 'MIIC...',
      })

      const url = await provider.getLoginUrl('test-state')
      expect(url).toContain('https://idp.example.com/sso/saml')
      expect(url).toContain('SAMLRequest=')
      expect(url).toContain('RelayState=test-state')
    })

    it('throws when entryPoint is missing', async () => {
      const provider = new SamlProvider(baseConfig)
      await expect(provider.getLoginUrl('s')).rejects.toThrow('entryPoint not configured')
    })

    it('validates callback extracts email from SAMLResponse', async () => {
      const provider = new SamlProvider({
        ...baseConfig,
        entryPoint: 'https://idp.example.com/sso',
      })

      const samlXml = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
        <saml:Assertion>
          <saml:NameID>user@example.com</saml:NameID>
          <saml:AttributeStatement>
            <saml:Attribute Name="displayName"><saml:AttributeValue>Test User</saml:AttributeValue></saml:Attribute>
          </saml:AttributeStatement>
        </saml:Assertion>
      </samlp:Response>`
      const encoded = Buffer.from(samlXml).toString('base64')

      const profile = await provider.validateCallback({ SAMLResponse: encoded })
      expect(profile.email).toBe('user@example.com')
      expect(profile.name).toBe('Test User')
      expect(profile.idpSessionId).toBeDefined()
    })

    it('throws when SAMLResponse is missing', async () => {
      const provider = new SamlProvider({
        ...baseConfig,
        entryPoint: 'https://idp.example.com/sso',
      })
      await expect(provider.validateCallback({})).rejects.toThrow('Missing SAMLResponse')
    })

    it('extracts groups from SAML attributes', async () => {
      const provider = new SamlProvider({
        ...baseConfig,
        entryPoint: 'https://idp.example.com/sso',
      })

      const samlXml = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
        <saml:Assertion>
          <saml:NameID>user@example.com</saml:NameID>
          <saml:AttributeStatement>
            <saml:Attribute Name="groups"><saml:AttributeValue>engineering</saml:AttributeValue></saml:Attribute>
            <saml:Attribute Name="groups"><saml:AttributeValue>devops</saml:AttributeValue></saml:Attribute>
          </saml:AttributeStatement>
        </saml:Assertion>
      </samlp:Response>`
      const encoded = Buffer.from(samlXml).toString('base64')

      const profile = await provider.validateCallback({ SAMLResponse: encoded })
      expect(profile.groups).toContain('engineering')
    })

    it('testConnection fails with missing entryPoint', async () => {
      const provider = new SamlProvider(baseConfig)
      const result = await provider.testConnection()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing entryPoint')
    })
  })

  describe('OidcProvider', () => {
    it('throws when discoveryUrl is not configured', async () => {
      const provider = new OidcProvider(baseConfig)
      await expect(provider.getLoginUrl('s')).rejects.toThrow('discoveryUrl not configured')
    })

    it('throws when authorization code is missing', async () => {
      const provider = new OidcProvider({
        ...baseConfig,
        discoveryUrl: 'https://example.com/.well-known/openid-configuration',
      })
      // We can't easily test validateCallback without mocking fetch, but we can test missing code
      await expect(provider.validateCallback({})).rejects.toThrow('Missing authorization code')
    })

    it('testConnection fails with missing clientId', async () => {
      const provider = new OidcProvider(baseConfig)
      const result = await provider.testConnection()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing clientId')
    })

    it('testConnection fails with missing clientSecret', async () => {
      const provider = new OidcProvider({ ...baseConfig, clientId: 'test' })
      const result = await provider.testConnection()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing clientSecret')
    })

    it('testConnection fails with missing discoveryUrl', async () => {
      const provider = new OidcProvider({ ...baseConfig, clientId: 'test', clientSecret: 'secret' })
      const result = await provider.testConnection()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing discoveryUrl')
    })
  })

  describe('createSsoProvider factory', () => {
    it('creates SamlProvider for CUSTOM_SAML', () => {
      const provider = createSsoProvider('CUSTOM_SAML', baseConfig)
      expect(provider).toBeInstanceOf(SamlProvider)
    })

    it('creates OidcProvider for CUSTOM_OIDC', () => {
      const provider = createSsoProvider('CUSTOM_OIDC', baseConfig)
      expect(provider).toBeInstanceOf(OidcProvider)
    })

    it('creates OidcProvider for GOOGLE_WORKSPACE', () => {
      const provider = createSsoProvider('GOOGLE_WORKSPACE', {
        ...baseConfig,
        clientId: 'x',
        clientSecret: 'y',
      })
      expect(provider).toBeInstanceOf(OidcProvider)
    })

    it('creates OidcProvider for OKTA', () => {
      const provider = createSsoProvider('OKTA', {
        ...baseConfig,
        clientId: 'x',
        clientSecret: 'y',
        discoveryUrl: 'https://okta.example.com/.well-known/openid-configuration',
      })
      expect(provider).toBeInstanceOf(OidcProvider)
    })

    it('creates OidcProvider for AZURE_AD', () => {
      const provider = createSsoProvider('AZURE_AD', {
        ...baseConfig,
        clientId: 'x',
        clientSecret: 'y',
        discoveryUrl:
          'https://login.microsoftonline.com/tenant/v2.0/.well-known/openid-configuration',
      })
      expect(provider).toBeInstanceOf(OidcProvider)
    })

    it('throws for unsupported provider', () => {
      expect(() => createSsoProvider('UNKNOWN' as any, baseConfig)).toThrow(
        'Unsupported SSO provider',
      )
    })
  })
})
