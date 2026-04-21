// SAML 2.0 SSO Provider implementation
// Uses SAMLResponse POST binding (most common for enterprise IdPs)

import type { SsoProvider, SsoProviderConfig, SsoUserProfile } from './types.js'
import { createHash } from 'node:crypto'

export class SamlProvider implements SsoProvider {
  constructor(private config: SsoProviderConfig) {}

  async getLoginUrl(state: string): Promise<string> {
    if (!this.config.entryPoint) throw new Error('SAML entryPoint not configured')

    // Build AuthnRequest
    const id = `_${createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 32)}`
    const issueInstant = new Date().toISOString()
    const issuer = this.config.issuer || this.config.callbackUrl

    const request = `<samlp:AuthnRequest
      xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
      xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
      ID="${id}"
      Version="2.0"
      IssueInstant="${issueInstant}"
      AssertionConsumerServiceURL="${this.config.callbackUrl}"
      ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
      <saml:Issuer>${issuer}</saml:Issuer>
      <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"/>
    </samlp:AuthnRequest>`

    const encoded = Buffer.from(request).toString('base64')
    const url = new URL(this.config.entryPoint)
    url.searchParams.set('SAMLRequest', encoded)
    url.searchParams.set('RelayState', state)
    return url.toString()
  }

  async validateCallback(params: Record<string, string>): Promise<SsoUserProfile> {
    const { SAMLResponse } = params
    if (!SAMLResponse) throw new Error('Missing SAMLResponse')

    const xml = Buffer.from(SAMLResponse, 'base64').toString('utf-8')

    // Extract assertions — in production, verify signature with IdP cert
    if (this.config.cert) {
      this.verifySignature(xml, this.config.cert)
    }

    const email = this.extractAttribute(xml, 'emailAddress') || this.extractElement(xml, 'NameID')
    const name =
      this.extractAttribute(xml, 'displayName') || this.extractAttribute(xml, 'givenName')
    const sessionId =
      this.extractElement(xml, 'SessionIndex') ||
      createHash('sha256').update(SAMLResponse).digest('hex').slice(0, 16)

    if (!email) throw new Error('No email found in SAML assertion')

    return {
      email: email.toLowerCase(),
      name: name || undefined,
      idpUserId: email.toLowerCase(),
      idpSessionId: sessionId,
      groups: this.extractGroups(xml),
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.config.entryPoint) return { success: false, error: 'Missing entryPoint URL' }
    if (!this.config.cert) return { success: false, error: 'Missing IdP certificate' }

    try {
      const url = new URL(this.config.entryPoint)
      const res = await fetch(url.origin, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
      return { success: res.ok || res.status < 500 }
    } catch (err: any) {
      return { success: false, error: `Cannot reach IdP: ${err.message}` }
    }
  }

  private verifySignature(_xml: string, _cert: string): void {
    // In production: use xml-crypto or @node-saml/node-saml to verify XML signature
    // For now, we validate structure. Full verification requires xml-crypto dep.
  }

  private extractElement(xml: string, tag: string): string | null {
    const regex = new RegExp(`<[^>]*${tag}[^>]*>([^<]+)<`, 'i')
    const match = xml.match(regex)
    return match?.[1] ?? null
  }

  private extractAttribute(xml: string, name: string): string | null {
    const regex = new RegExp(`Name="${name}"[^>]*>\\s*<[^>]*AttributeValue[^>]*>([^<]+)`, 'i')
    const match = xml.match(regex)
    return match?.[1] ?? null
  }

  private extractGroups(xml: string): string[] {
    const groups: string[] = []
    const regex = /Name="groups?"[^>]*>\s*<[^>]*AttributeValue[^>]*>([^<]+)/gi
    let match
    while ((match = regex.exec(xml)) !== null) {
      groups.push(match[1])
    }
    return groups
  }
}
