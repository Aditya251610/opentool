'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2 } from 'lucide-react'
import { PROVIDERS, type ProviderMeta } from '@/lib/providers'
import { Card, Badge } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { stagger, fadeUp } from '@/lib/animation'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'

type Filter = 'all' | 'connected' | 'available'

export default function ToolsPage() {
  const { apiKey } = useAuth()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set())
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch connected tools from server
  useEffect(() => {
    if (!apiKey) return

    async function fetchConnected() {
      try {
        const { tools } = await api.tools.connected(apiKey!)
        const providers = new Set(tools.map(t => t.provider))
        setConnectedProviders(providers)
      } catch {
        // Server may be down — show all as disconnected
      } finally {
        setLoading(false)
      }
    }

    fetchConnected()
    // Poll every 10s so CLI-connected tools show up without manual refresh
    const interval = setInterval(fetchConnected, 10000)
    return () => clearInterval(interval)
  }, [apiKey])

  // Handle OAuth callback redirect (e.g. ?connected=github)
  useEffect(() => {
    const justConnected = searchParams.get('connected')
    const errorProvider = searchParams.get('error')

    if (justConnected) {
      setConnectedProviders(prev => new Set([...prev, justConnected]))
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

  const filtered = Object.entries(PROVIDERS).filter(([key, p]) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    const isConnected = connectedProviders.has(key)
    if (filter === 'connected') return matchesSearch && isConnected
    if (filter === 'available') return matchesSearch && !isConnected
    return matchesSearch
  })

  const connected = Object.keys(PROVIDERS).filter(k => connectedProviders.has(k))
  const available = Object.keys(PROVIDERS).filter(k => !connectedProviders.has(k))

  async function handleConnect(provider: string) {
    if (!apiKey) return
    setConnecting(provider)
    try {
      const res = await api.tools.connectUrl(provider, apiKey)
      if (res.authType === 'API_KEY') {
        // API key providers connect instantly (no OAuth redirect)
        await api.tools.connectApiKey(provider, apiKey)
        setConnectedProviders(prev => new Set([...prev, provider]))
        toast.success(`${PROVIDERS[provider].name} connected!`)
        setConnecting(null)
      } else if (res.url) {
        // Redirect to OAuth provider
        window.location.href = res.url
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to connect ${PROVIDERS[provider].name}`)
      setConnecting(null)
    }
  }

  async function handleDisconnect(provider: string) {
    if (!apiKey) return
    setDisconnecting(provider)
    try {
      await api.tools.disconnect(provider, apiKey)
      setConnectedProviders(prev => {
        const next = new Set(prev)
        next.delete(provider)
        return next
      })
      toast.success(`${PROVIDERS[provider].name} disconnected`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to disconnect ${PROVIDERS[provider].name}`)
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#ededed]">Tools</h1>
          <p className="text-[13px] text-[#525252] mt-1">Connect and manage your tool providers.</p>
        </div>
      </motion.div>

      {/* Search + Filter */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex items-center gap-3 mb-6">
        <div className="relative w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]" />
          <input
            type="text"
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#111111] border border-[#1f1f1f] text-sm text-[#ededed] placeholder-[#525252] outline-none focus:border-[#06b6d4] transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'connected', 'available'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                filter === f
                  ? 'bg-[#1a1a1a] text-[#ededed] border border-[#2e2e2e]'
                  : 'text-[#525252] hover:text-[#a1a1aa] border border-transparent'
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
          <Loader2 size={24} className="animate-spin text-[#525252]" />
        </div>
      ) : (
        <>
          {/* Tool Grid */}
          <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-3 gap-4">
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
                    onDisconnect={() => handleDisconnect(key)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {filtered.length === 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" className="text-center py-16">
              <div className="text-4xl mb-4">🔌</div>
              <p className="text-[15px] font-medium text-[#a1a1aa]">No tools found</p>
              <p className="text-[13px] text-[#525252] mt-1">Try a different search or filter.</p>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}

function ToolCard({ id, provider, connected, connecting, disconnecting, onConnect, onDisconnect }: {
  id: string; provider: ProviderMeta; connected: boolean; connecting: boolean; disconnecting: boolean
  onConnect: () => void; onDisconnect: () => void
}) {
  return (
    <motion.div
      className="relative border rounded-xl p-5 bg-[#111111] overflow-hidden group"
      style={{ borderColor: connected ? 'rgba(34,197,94,0.2)' : '#1f1f1f' }}
      whileHover={{
        y: -2,
        boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
        borderColor: connected ? 'rgba(34,197,94,0.3)' : 'rgba(6,182,212,0.3)',
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
        className="w-10 h-10 rounded-xl border border-[#1f1f1f] flex items-center justify-center"
        style={{ background: provider.bg }}
      >
        <provider.Icon size={20} className="shrink-0" style={{ color: provider.color }} />
      </div>

      <h3 className="text-[15px] font-semibold text-[#ededed] mt-3">{provider.name}</h3>
      <p className="text-[13px] text-[#525252] mt-1">{provider.description}</p>

      {/* Tools list */}
      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#525252] mb-1.5">Actions</p>
        <div className="flex flex-wrap gap-1">
          {provider.tools.slice(0, 3).map(t => (
            <span key={t} className="text-[11px] font-mono text-[#a1a1aa] bg-[#0a0a0a] border border-[#1f1f1f] px-1.5 py-0.5 rounded">
              {t}
            </span>
          ))}
          {provider.tools.length > 3 && (
            <span className="text-[11px] text-[#525252]">+{provider.tools.length - 3} more</span>
          )}
        </div>
      </div>

      {/* Auth type badge */}
      <div className="mt-3">
        <Badge variant={provider.authType === 'oauth2' ? 'accent' : provider.authType === 'api_key' ? 'purple' : 'default'}>
          {provider.authType === 'oauth2' ? 'OAuth 2.0' : provider.authType === 'api_key' ? 'API Key' : 'No Auth'}
        </Badge>
      </div>

      {/* Action */}
      <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
        {connected ? (
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#525252]">Connected</span>
            <Button variant="danger" size="sm" loading={disconnecting} onClick={onDisconnect}>Disconnect</Button>
          </div>
        ) : (
          <Button variant="primary" size="sm" className="w-full" loading={connecting} onClick={onConnect}>
            {connecting ? 'Redirecting...' : `Connect ${provider.name}`}
          </Button>
        )}
      </div>
    </motion.div>
  )
}
