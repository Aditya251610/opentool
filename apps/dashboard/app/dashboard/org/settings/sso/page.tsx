'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { orgApi, getServerUrl } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PermissionGate } from '@/components/org/permission-gate'

type SsoProviderType = 'GOOGLE_WORKSPACE' | 'OKTA' | 'AZURE_AD' | 'CUSTOM_SAML' | 'CUSTOM_OIDC'

interface SsoConfig {
  type: 'saml' | 'oidc'
  entityId?: string
  ssoUrl?: string
  certificate?: string
  clientId?: string
  clientSecret?: string
  issuerUrl?: string
  allowedDomains: string[]
  defaultRole: string
}

const PROVIDERS: { id: SsoProviderType; name: string; type: 'oidc' | 'saml'; icon: string }[] = [
  { id: 'GOOGLE_WORKSPACE', name: 'Google Workspace', type: 'oidc', icon: '🔵' },
  { id: 'OKTA', name: 'Okta', type: 'oidc', icon: '🟦' },
  { id: 'AZURE_AD', name: 'Azure AD', type: 'oidc', icon: '🔷' },
  { id: 'CUSTOM_SAML', name: 'Custom SAML', type: 'saml', icon: '🔐' },
  { id: 'CUSTOM_OIDC', name: 'Custom OIDC', type: 'oidc', icon: '🔑' },
]

export default function SsoSettingsPage() {
  const { activeOrg } = useAuth()
  const [step, setStep] = useState(1)
  const [selectedProvider, setSelectedProvider] = useState<(typeof PROVIDERS)[0] | null>(null)
  const [config, setConfig] = useState<Partial<SsoConfig>>({
    allowedDomains: [],
    defaultRole: 'MEMBER',
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  if (!activeOrg) return <div className="p-8 text-white/40">Select an organization first</div>

  async function handleTest() {
    if (!activeOrg || !selectedProvider) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await orgApi.testSso(activeOrg.org.slug)
      setTestResult(res)
    } catch (err: any) {
      setTestResult({ success: false, error: err.message })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    if (!activeOrg || !selectedProvider) return
    setSaving(true)
    setError('')
    try {
      await orgApi.configureSso(activeOrg.org.slug, {
        provider: selectedProvider.id,
        config: {
          type: selectedProvider.type,
          ...config,
        },
      })
      setSaved(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDisable() {
    if (!activeOrg) return
    if (!confirm('This will disable SSO for all members. Continue?')) return
    try {
      await orgApi.disableSso(activeOrg.org.slug)
      setStep(1)
      setSelectedProvider(null)
      setConfig({ allowedDomains: [], defaultRole: 'MEMBER' })
      setSaved(false)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <PermissionGate permission="ORG_SSO_CONFIGURE">
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-xl font-semibold text-white mb-2">SSO Configuration</h1>
        <p className="text-sm text-white/40 mb-8">
          Configure Single Sign-On for your organization. Members can sign in using their identity
          provider.
        </p>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border ${step >= s ? 'border-[#00d4ff] text-[#00d4ff] bg-[rgba(0,212,255,0.08)]' : 'border-white/10 text-white/30'}`}
              >
                {s}
              </div>
              {s < 4 && (
                <div className={`w-8 h-px ${step > s ? 'bg-[#00d4ff]/40' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select provider */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <h2 className="text-sm font-medium text-white/70 mb-4">
              Select your identity provider
            </h2>
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProvider(p)
                  setConfig((c) => ({ ...c, type: p.type }))
                  setStep(2)
                }}
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[rgba(0,212,255,0.3)] hover:bg-[rgba(0,212,255,0.02)] transition-all"
              >
                <span className="text-xl">{p.icon}</span>
                <div className="text-left">
                  <p className="text-sm text-white font-medium">{p.name}</p>
                  <p className="text-[11px] text-white/30">{p.type.toUpperCase()} protocol</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}

        {/* Step 2: Configure */}
        {step === 2 && selectedProvider && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-sm font-medium text-white/70 mb-4">
              Configure {selectedProvider.name}
            </h2>

            {selectedProvider.type === 'saml' ? (
              <>
                <Input
                  label="IdP SSO URL"
                  placeholder="https://your-idp.com/sso/saml"
                  value={config.ssoUrl || ''}
                  onChange={(e) => setConfig((c) => ({ ...c, ssoUrl: e.target.value }))}
                />
                <Input
                  label="Entity ID"
                  placeholder="https://your-idp.com/entity"
                  value={config.entityId || ''}
                  onChange={(e) => setConfig((c) => ({ ...c, entityId: e.target.value }))}
                />
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">
                    IdP Certificate (PEM)
                  </label>
                  <textarea
                    className="w-full h-28 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 text-xs text-white/70 font-mono resize-none focus:border-[rgba(0,212,255,0.3)] focus:outline-none"
                    placeholder="-----BEGIN CERTIFICATE-----&#10;MIIC...&#10;-----END CERTIFICATE-----"
                    value={config.certificate || ''}
                    onChange={(e) => setConfig((c) => ({ ...c, certificate: e.target.value }))}
                  />
                </div>
                <div className="p-3 rounded-lg bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.12)]">
                  <p className="text-xs text-white/50 mb-1">Your SP metadata:</p>
                  <p className="text-xs text-[#00d4ff] font-mono break-all">
                    ACS URL: {getServerUrl()}/api/auth/sso/saml/callback/{activeOrg.org.slug}
                  </p>
                  <p className="text-xs text-[#00d4ff] font-mono break-all mt-1">
                    Entity ID: {getServerUrl()}/sso/saml/{activeOrg.org.slug}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Input
                  label="Client ID"
                  placeholder="your-client-id"
                  value={config.clientId || ''}
                  onChange={(e) => setConfig((c) => ({ ...c, clientId: e.target.value }))}
                />
                <Input
                  label="Client Secret"
                  type="password"
                  placeholder="your-client-secret"
                  value={config.clientSecret || ''}
                  onChange={(e) => setConfig((c) => ({ ...c, clientSecret: e.target.value }))}
                />
                {(selectedProvider.id === 'CUSTOM_OIDC' || selectedProvider.id === 'OKTA') && (
                  <Input
                    label="Issuer URL"
                    placeholder="https://your-idp.com/.well-known/openid-configuration"
                    value={config.issuerUrl || ''}
                    onChange={(e) => setConfig((c) => ({ ...c, issuerUrl: e.target.value }))}
                  />
                )}
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Next
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Domains & Role */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-sm font-medium text-white/70 mb-4">Access configuration</h2>

            <Input
              label="Allowed email domains (comma-separated)"
              placeholder="acme.com, corp.acme.com"
              value={(config.allowedDomains || []).join(', ')}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  allowedDomains: e.target.value
                    .split(',')
                    .map((d) => d.trim())
                    .filter(Boolean),
                }))
              }
            />

            <div>
              <label className="text-xs text-white/50 mb-1.5 block">
                Default role for new SSO users
              </label>
              <select
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-2.5 text-sm text-white/70 focus:border-[rgba(0,212,255,0.3)] focus:outline-none"
                value={config.defaultRole || 'MEMBER'}
                onChange={(e) => setConfig((c) => ({ ...c, defaultRole: e.target.value }))}
              >
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(4)}>
                Next: Test & Enable
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Test & Enable */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-sm font-medium text-white/70 mb-4">Test & enable SSO</h2>

            <div className="p-4 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
              <p className="text-sm text-white/60 mb-3">
                Provider: <span className="text-white font-medium">{selectedProvider?.name}</span>
              </p>
              <p className="text-sm text-white/60 mb-3">
                Domains:{' '}
                <span className="text-white font-medium">
                  {(config.allowedDomains || []).join(', ') || 'None'}
                </span>
              </p>
              <p className="text-sm text-white/60">
                Default role: <span className="text-white font-medium">{config.defaultRole}</span>
              </p>
            </div>

            {/* Test result */}
            <AnimatePresence>
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-3 rounded-lg border ${testResult.success ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-red-500/20 bg-red-500/5 text-red-400'} text-xs`}
                >
                  {testResult.success
                    ? '✓ Connection successful'
                    : `✗ ${testResult.error || 'Test failed'}`}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs">
                {error}
              </div>
            )}

            {saved && (
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs">
                ✓ SSO enabled successfully
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button variant="secondary" onClick={handleTest} loading={testing}>
                Test Connection
              </Button>
              <Button variant="primary" onClick={handleSave} loading={saving} disabled={saved}>
                {saved ? 'Enabled ✓' : 'Enable SSO'}
              </Button>
            </div>

            {saved && (
              <Button
                variant="secondary"
                className="mt-4 text-red-400 border-red-400/20 hover:bg-red-400/5"
                onClick={handleDisable}
              >
                Disable SSO
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </PermissionGate>
  )
}
