'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Copy, Check, AlertTriangle, Trash2, Loader2 } from 'lucide-react'
import { Card, Badge } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { fadeUp, stagger } from '@/lib/animation'
import { useAuth } from '@/lib/auth-context'
import { api, type ApiKey } from '@/lib/api'
import { toast } from 'sonner'

export default function KeysPage() {
  const { apiKey } = useAuth()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [copiedPrefix, setCopiedPrefix] = useState<string | null>(null)

  const handleCopyPrefix = useCallback((prefix: string) => {
    navigator.clipboard.writeText(prefix)
    setCopiedPrefix(prefix)
    toast.success('Prefix copied')
    setTimeout(() => setCopiedPrefix(null), 2000)
  }, [])
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    if (!apiKey) return
    try {
      const { keys: serverKeys } = await api.keys.list()
      setKeys(serverKeys.filter((k) => k.name !== 'Dashboard Session'))
    } catch {
      toast.error('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleCreate = useCallback(async () => {
    if (!newKeyName.trim() || !apiKey) return
    setCreating(true)
    try {
      const result = await api.keys.create(newKeyName.trim())
      setNewKeyValue(result.key)
      setShowCreate(false)
      setNewKeyName('')
      toast.success('API key created')
      // Refresh key list
      await fetchKeys()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }, [newKeyName, apiKey, fetchKeys])

  const handleRevoke = useCallback(
    async (keyId: string) => {
      if (!apiKey) return
      setRevoking(keyId)
      try {
        await api.keys.revoke(keyId)
        setKeys((prev) => prev.filter((k) => k.id !== keyId))
        toast.success('API key revoked')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to revoke key')
      } finally {
        setRevoking(null)
        setConfirmRevoke(null)
      }
    },
    [apiKey],
  )

  const [newKeyCopied, setNewKeyCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (!newKeyValue) return
    navigator.clipboard.writeText(newKeyValue)
    setNewKeyCopied(true)
    toast.success('API key copied')
    setTimeout(() => setNewKeyCopied(false), 2000)
  }, [newKeyValue])

  return (
    <div>
      {/* Header */}
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-3"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#ededed]">API Keys</h1>
          <p className="text-xs text-[#737373] mt-1 max-w-lg">
            API keys let your AI agents authenticate with OpenTool&apos;s MCP server. Treat them
            like passwords — never commit to source control.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Create Key
        </Button>
      </motion.div>

      {/* New Key Banner */}
      <AnimatePresence>
        {newKeyValue && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            <Card highlighted>
              <div className="flex items-center gap-2 text-[#eab308] mb-3">
                <AlertTriangle size={15} />
                <span className="text-xs font-medium">
                  Save this key — it won&apos;t be shown again
                </span>
              </div>
              <div className="flex items-center gap-2 bg-[#0a0a1a] border border-[rgba(139,92,246,0.12)] rounded-lg px-4 py-3">
                <code className="flex-1 text-xs font-mono text-[#22c55e] break-all">
                  {newKeyValue}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 p-1.5 rounded-md hover:bg-[#15153a] transition-colors cursor-pointer"
                >
                  {newKeyCopied ? (
                    <Check size={14} className="text-[#22c55e]" />
                  ) : (
                    <Copy size={14} className="text-[#737373]" />
                  )}
                </button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => setNewKeyValue(null)}
              >
                I&apos;ve saved my key
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Key Modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-[420px] bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-2xl p-6 shadow-2xl"
            >
              <h3 className="text-base font-semibold text-[#ededed]">Create API Key</h3>
              <p className="text-xs text-[#737373] mt-1">
                Give your key a name to identify where it&apos;s used.
              </p>

              <div className="mt-5">
                <Input
                  label="Key Name"
                  placeholder="e.g. Production, Claude Code, Local Dev"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  loading={creating}
                  onClick={handleCreate}
                >
                  Create Key
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Keys Table */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="mt-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[#737373]" />
          </div>
        ) : keys.length === 0 && !newKeyValue ? (
          <Card className="text-center py-16">
            <div className="text-4xl mb-4">🔑</div>
            <p className="text-sm font-medium text-[#a1a1aa]">No API keys yet</p>
            <p className="text-xs text-[#737373] mt-1">
              Create your first API key to connect an AI agent.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={14} /> Create API Key
            </Button>
          </Card>
        ) : (
          keys.length > 0 && (
            <Card className="p-0 overflow-x-auto">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_140px_160px_120px_80px] gap-4 px-5 py-3 border-b border-[rgba(139,92,246,0.12)] bg-[#0a0a1a] min-w-[600px]">
                {['Name', 'Prefix', 'Created', 'Last Used', ''].map((h) => (
                  <span
                    key={h}
                    className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#737373]"
                  >
                    {h}
                  </span>
                ))}
              </div>
              {/* Rows */}
              <motion.div variants={stagger} initial="initial" animate="animate">
                {keys.map((key) => (
                  <motion.div
                    key={key.id}
                    variants={fadeUp}
                    className="grid grid-cols-[1fr_140px_160px_120px_80px] gap-4 px-5 py-3.5 border-b border-[rgba(139,92,246,0.12)] last:border-b-0 items-center min-w-[600px]"
                  >
                    <span className="text-xs font-medium text-[#ededed]">{key.name}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-[#a1a1aa] bg-[#0a0a1a] border border-[rgba(139,92,246,0.12)] px-2 py-0.5 rounded">
                        {key.keyPrefix}…
                      </span>
                      <button
                        onClick={() => handleCopyPrefix(key.keyPrefix)}
                        className="p-1 rounded-md hover:bg-[#15153a] transition-colors cursor-pointer"
                        title="Copy prefix"
                      >
                        {copiedPrefix === key.keyPrefix ? (
                          <Check size={12} className="text-[#22c55e]" />
                        ) : (
                          <Copy size={12} className="text-[#737373]" />
                        )}
                      </button>
                    </span>
                    <span className="text-xs text-[#737373]">
                      {new Date(key.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-xs text-[#737373]">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Never'}
                    </span>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={revoking === key.id}
                      onClick={() => setConfirmRevoke(key.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            </Card>
          )
        )}
      </motion.div>

      <ConfirmDialog
        open={!!confirmRevoke}
        title="Revoke API Key"
        description="This key will stop working immediately. Any integrations using it will break. This cannot be undone."
        confirmLabel="Revoke Key"
        variant="danger"
        loading={!!revoking}
        onConfirm={() => confirmRevoke && handleRevoke(confirmRevoke)}
        onCancel={() => setConfirmRevoke(null)}
      />
    </div>
  )
}
