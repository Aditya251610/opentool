'use client'

import { useState, useEffect, useMemo, memo, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2 } from 'lucide-react'
import { PROVIDERS, type ProviderMeta } from '@/lib/providers'
import { Card, Badge } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { stagger, fadeUp } from '@/lib/animation'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'

type Filter = 'all' | 'connected' | 'available'

const API_KEY_LABELS: Record<string, { label: string; placeholder: string; help: string }> = {
  resend: {
    label: 'Resend API Key',
    placeholder: 're_xxxxxxxxxxxx',
    help: 'Get your API key from resend.com/api-keys',
  },
  postgres: {
    label: 'Neon API Key',
    placeholder: 'neon_xxxxxxxxxxxx',
    help: 'Get your API key from console.neon.tech',
  },
}

function ToolsPageContent() {
  const { apiKey } = useAuth()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set())
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiKeyModal, setApiKeyModal] = useState<string | null>(null)
  const [providerKeyInput, setProviderKeyInput] = useState('')

  // Fetch connected tools from server
  useEffect(() => {
    if (!apiKey) return

    async function fetchConnected() {
      try {
        const { tools } = await api.tools.connected()
        const providers = new Set(tools.map((t) => t.provider))
        setConnectedProviders(providers)
      } catch {
        // Server may be down — show all as disconnected
      } finally {
        setLoading(false)
      }
    }

    fetchConnected()
    let interval = setInterval(fetchConnected, 30000)
    function handleVisibility() {
      clearInterval(interval)
      if (!document.hidden) interval = setInterval(fetchConnected, 30000)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [apiKey])

  // Handle OAuth callback redirect (e.g. ?connected=github)
  useEffect(() => {
    const justConnected = searchParams.get('connected')
    const errorProvider = searchParams.get('error')

    if (justConnected) {
      setConnectedProviders((prev) => new Set([...prev, justConnected]))
      const name = PROVIDERS[justConnected]?.name || justConnected
      toast.success(`${name} connected successfully`)
      window.history.replaceState({}, '', '/dashboard/tools')
    }
    if (errorProvider) {
      const name = PROVIDERS[errorProvider]?.name || errorProvider
      toast.error(`Failed to connect ${name}. Please try again.`)
      window.history.replaceState({}, '', '/dashboard/tools')
    }
  }, [searchParams])

  const filtered = useMemo(
    () =>
      Object.entries(PROVIDERS).filter(([key, p]) => {
        const matchesSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
        const isConnected = connectedProviders.has(key)
        if (filter === 'connected') return matchesSearch && isConnected
        if (filter === 'available') return matchesSearch && !isConnected
        return matchesSearch
      }),
    [search, filter, connectedProviders],
  )

  const connected = useMemo(
    () => Object.keys(PROVIDERS).filter((k) => connectedProviders.has(k)),
    [connectedProviders],
  )
  const available = useMemo(
    () => Object.keys(PROVIDERS).filter((k) => !connectedProviders.has(k)),
    [connectedProviders],
  )

  async function handleConnect(provider: string) {
    if (!apiKey) return
    setConnecting(provider)
    try {
      const res = await api.tools.connectUrl(provider)
      if (res.authType === 'API_KEY') {
        // Show modal for user to enter their own API key
        setApiKeyModal(provider)
        setProviderKeyInput('')
        setConnecting(null)
      } else if (res.url) {
        // Redirect to OAuth provider
        window.location.href = res.url
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to connect ${PROVIDERS[provider].name}`,
      )
      setConnecting(null)
    }
  }

  async function handleApiKeySubmit() {
    if (!apiKey || !apiKeyModal || !providerKeyInput.trim()) return
    setConnecting(apiKeyModal)
    try {
      await api.tools.connectApiKey(apiKeyModal, providerKeyInput.trim())
      setConnectedProviders((prev) => new Set([...prev, apiKeyModal]))
      toast.success(`${PROVIDERS[apiKeyModal].name} connected!`)
      setApiKeyModal(null)
      setProviderKeyInput('')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to connect ${PROVIDERS[apiKeyModal].name}`,
      )
    } finally {
      setConnecting(null)
    }
  }

  async function handleDisconnect(provider: string) {
    if (!apiKey) return
    setDisconnecting(provider)
    try {
      await api.tools.disconnect(provider)
      setConnectedProviders((prev) => {
        const next = new Set(prev)
        next.delete(provider)
        return next
      })
      toast.success(`${PROVIDERS[provider].name} disconnected`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to disconnect ${PROVIDERS[provider].name}`,
      )
    } finally {
      setDisconnecting(null)
      setConfirmDisconnect(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#ededed]">Tools</h1>
          <p className="text-xs text-[#737373] mt-1">Connect and manage your tool providers.</p>
        </div>
      </motion.div>

      {/* Search + Filter */}
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6"
      >
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
          <input
            type="text"
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] text-sm text-[#ededed] placeholder-[#737373] outline-none focus:border-[#00d4ff] transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'connected', 'available'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer min-h-[36px] ${
                filter === f
                  ? 'bg-[#15153a] text-[#ededed] border border-[rgba(139,92,246,0.2)]'
                  : 'text-[#737373] hover:text-[#a1a1aa] border border-transparent'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'connected' && connected.length > 0 && ` (${connected.length})`}
              {f === 'available' && ` (${available.length})`}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#737373]" />
        </div>
      ) : (
        <>
          {/* Tool Grid */}
          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map(([key, provider]) => (
                <motion.div
                  key={key}
                  variants={fadeUp}
                  layout
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                >
                  <ToolCard
                    id={key}
                    provider={provider}
                    connected={connectedProviders.has(key)}
                    connecting={connecting === key}
                    disconnecting={disconnecting === key}
                    onConnect={() => handleConnect(key)}
                    onDisconnect={() => setConfirmDisconnect(key)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {filtered.length === 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              className="text-center py-16"
            >
              <div className="text-4xl mb-4">🔌</div>
              <p className="text-sm font-medium text-[#a1a1aa]">No tools found</p>
              <p className="text-xs text-[#737373] mt-1">Try a different search or filter.</p>
            </motion.div>
          )}
        </>
      )}

      {/* API Key Modal */}
      <AnimatePresence>
        {apiKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setApiKeyModal(null)
              setProviderKeyInput('')
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md mx-4 p-6 rounded-xl bg-[#0a0a1a] border border-[rgba(139,92,246,0.12)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-[#ededed] mb-1">
                Connect {PROVIDERS[apiKeyModal]?.name}
              </h3>
              <p className="text-xs text-[#737373] mb-5">
                Enter your own {API_KEY_LABELS[apiKeyModal]?.label || 'API key'}. It will be
                encrypted and stored securely.
              </p>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-2">
                {API_KEY_LABELS[apiKeyModal]?.label || 'API Key'}
              </label>
              <input
                type="text"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                value={providerKeyInput}
                onChange={(e) => setProviderKeyInput(e.target.value)}
                placeholder={API_KEY_LABELS[apiKeyModal]?.placeholder || 'Enter your API key'}
                className="w-full h-10 px-3 rounded-lg bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] text-sm text-[#ededed] placeholder-[#737373] outline-none focus:border-[#00d4ff] transition-colors mb-2 [-webkit-text-security:disc]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApiKeySubmit()
                }}
              />
              <p className="text-[11px] text-[#737373] mb-5">
                {API_KEY_LABELS[apiKeyModal]?.help ||
                  'Your key is never shared and only used for your tool calls.'}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setApiKeyModal(null)
                    setProviderKeyInput('')
                  }}
                  className="px-4 py-2 rounded-lg text-xs text-[#a1a1aa] hover:text-white border border-[rgba(139,92,246,0.12)] hover:border-[rgba(139,92,246,0.25)] transition-colors"
                >
                  Cancel
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={connecting === apiKeyModal}
                  onClick={handleApiKeySubmit}
                  className={!providerKeyInput.trim() ? 'opacity-50 pointer-events-none' : ''}
                >
                  Connect
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmDisconnect}
        title={`Disconnect ${confirmDisconnect ? PROVIDERS[confirmDisconnect]?.name : ''}?`}
        description="This will remove the provider connection. Your agents will lose access to its tools until you reconnect."
        confirmLabel="Disconnect"
        variant="danger"
        loading={!!disconnecting}
        onConfirm={() => confirmDisconnect && handleDisconnect(confirmDisconnect)}
        onCancel={() => setConfirmDisconnect(null)}
      />
    </div>
  )
}

const ToolCard = memo(function ToolCard({
  id,
  provider,
  connected,
  connecting,
  disconnecting,
  onConnect,
  onDisconnect,
}: {
  id: string
  provider: ProviderMeta
  connected: boolean
  connecting: boolean
  disconnecting: boolean
  onConnect: () => void
  onDisconnect: () => void
}) {
  return (
    <motion.div
      className="relative border rounded-xl p-5 bg-[#0d0d24] overflow-hidden group"
      style={{ borderColor: connected ? 'rgba(34,197,94,0.2)' : 'rgba(139,92,246,0.12)' }}
      whileHover={{
        y: -2,
        boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
        borderColor: connected ? 'rgba(34,197,94,0.3)' : 'rgba(0,212,255,0.3)',
        transition: { duration: 0.2, ease: [0.0, 0.0, 0.2, 1] },
      }}
    >
      {/* Connected badge */}
      {connected && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
          </span>
          <span className="text-[11px] text-[#22c55e] font-medium">Connected</span>
        </div>
      )}

      {/* Provider icon */}
      <div
        className="w-10 h-10 rounded-xl border border-[rgba(139,92,246,0.12)] flex items-center justify-center"
        style={{ background: provider.bg }}
      >
        <provider.Icon size={20} className="shrink-0" style={{ color: provider.color }} />
      </div>

      <h3 className="text-sm font-semibold text-[#ededed] mt-3">{provider.name}</h3>
      <p className="text-xs text-[#737373] mt-1">{provider.description}</p>

      {/* Tools list */}
      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#737373] mb-1.5">
          Actions
        </p>
        <div className="flex flex-wrap gap-1">
          {provider.tools.slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-[11px] font-mono text-[#a1a1aa] bg-[#0a0a1a] border border-[rgba(139,92,246,0.12)] px-1.5 py-0.5 rounded"
            >
              {t}
            </span>
          ))}
          {provider.tools.length > 3 && (
            <span className="text-[11px] text-[#737373]">+{provider.tools.length - 3} more</span>
          )}
        </div>
      </div>

      {/* Auth type badge */}
      <div className="mt-3">
        <Badge
          variant={
            provider.authType === 'oauth2'
              ? 'accent'
              : provider.authType === 'api_key'
                ? 'purple'
                : 'default'
          }
        >
          {provider.authType === 'oauth2'
            ? 'OAuth 2.0'
            : provider.authType === 'api_key'
              ? 'API Key'
              : 'No Auth'}
        </Badge>
      </div>

      {/* Action */}
      <div className="mt-4 pt-4 border-t border-[rgba(139,92,246,0.12)]">
        {connected ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#737373]">Connected</span>
            <Button variant="danger" size="sm" loading={disconnecting} onClick={onDisconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            loading={connecting}
            onClick={onConnect}
          >
            {connecting ? 'Redirecting...' : `Connect ${provider.name}`}
          </Button>
        )}
      </div>
    </motion.div>
  )
})

export default function ToolsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#a1a1aa]" />
        </div>
      }
    >
      <ToolsPageContent />
    </Suspense>
  )
}
