'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Copy, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { orgApi, type OrgApiKey } from '@/lib/api'
import { PermissionGate } from '@/components/org/permission-gate'
import { useRouter } from 'next/navigation'

export default function OrgKeysPage() {
  const { apiKey, activeOrg } = useAuth()
  const router = useRouter()
  const [keys, setKeys] = useState<OrgApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [newKey, setNewKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeOrg || !apiKey) {
      router.push('/dashboard')
      return
    }
    loadKeys()
  }, [apiKey, activeOrg])

  async function loadKeys() {
    if (!apiKey || !activeOrg) return
    try {
      const { keys: k } = await orgApi.orgKeys(activeOrg.org.slug)
      setKeys(k)
    } catch {
      /* handled */
    }
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey || !activeOrg || !name) return
    setError('')
    try {
      const result = await orgApi.createOrgKey(activeOrg.org.slug, { name })
      setNewKey(result.key)
      setName('')
      setShowCreate(false)
      loadKeys()
    } catch (err: any) {
      setError(err.message || 'Failed to create key')
    }
  }

  async function handleRevoke(keyId: string) {
    if (!apiKey || !activeOrg) return
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    try {
      await orgApi.revokeOrgKey(activeOrg.org.slug, keyId)
      loadKeys()
    } catch {
      /* handled */
    }
  }

  function copyKey() {
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!activeOrg) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#ededed]">Organization API Keys</h1>
          <p className="text-sm text-[#737373] mt-1">Shared keys for {activeOrg.org.name}</p>
        </div>
        <PermissionGate permission="KEYS_CREATE">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#8b5cf6] text-white text-xs font-medium hover:bg-[#7c3aed] transition-colors"
          >
            <Plus size={14} /> New Key
          </button>
        </PermissionGate>
      </div>

      {/* New key reveal */}
      {newKey && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] rounded-lg p-4"
        >
          <p className="text-xs text-[#10b981] mb-2 font-medium">
            Key created! Copy it now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[#050510] px-3 py-1.5 rounded text-xs text-[#ededed] font-mono truncate">
              {newKey}
            </code>
            <button
              onClick={copyKey}
              className="p-1.5 rounded hover:bg-[rgba(139,92,246,0.1)] transition-colors"
            >
              {copied ? (
                <Check size={14} className="text-[#10b981]" />
              ) : (
                <Copy size={14} className="text-[#737373]" />
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Create form */}
      {showCreate && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleCreate}
          className="bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-lg p-4 space-y-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name (e.g. production-ci)"
            className="w-full bg-[#050510] border border-[rgba(139,92,246,0.15)] rounded-md px-3 py-1.5 text-sm text-[#ededed] placeholder:text-[#737373] focus:outline-none focus:border-[#8b5cf6]"
            required
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-[#8b5cf6] text-white text-xs font-medium hover:bg-[#7c3aed]"
            >
              Create Key
            </button>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        </motion.form>
      )}

      {/* Keys table */}
      <div className="bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#737373] text-sm">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-[#737373] text-sm">
            No organization API keys yet.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(139,92,246,0.08)]">
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#737373] font-medium">
                  Name
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#737373] font-medium">
                  Prefix
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#737373] font-medium">
                  Created
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#737373] font-medium">
                  Status
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr
                  key={k.id}
                  className="border-b border-[rgba(139,92,246,0.04)] hover:bg-[rgba(139,92,246,0.04)] transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-[#ededed]">{k.name}</td>
                  <td className="px-4 py-3 text-xs text-[#737373] font-mono">{k.keyPrefix}…</td>
                  <td className="px-4 py-3 text-xs text-[#737373]">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${k.revokedAt ? 'text-red-400 bg-red-400/10' : 'text-[#10b981] bg-[#10b981]/10'}`}
                    >
                      {k.revokedAt ? 'Revoked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!k.revokedAt && (
                      <PermissionGate permission="KEYS_REVOKE">
                        <button
                          onClick={() => handleRevoke(k.id)}
                          className="text-[#737373] hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </PermissionGate>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
