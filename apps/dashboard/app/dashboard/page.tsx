'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wrench, Key, Zap, Activity, ExternalLink, Loader2 } from 'lucide-react'
import { PROVIDERS } from '@/lib/providers'
import { Card, Badge } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code-block'
import { stagger, fadeUp } from '@/lib/animation'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import Link from 'next/link'

const CONFIG_SNIPPET = `{
  "mcpServers": {
    "opentool": {
      "command": "npx",
      "args": ["@opentool-ts/cli", "mcp", "start"],
      "env": {
        "OPENTOOL_API_KEY": "ot_your-key-here"
      }
    }
  }
}`

interface Stats {
  connectedCount: number
  totalTools: number
  keyCount: number
  serverOnline: boolean
  loading: boolean
}

export default function OverviewPage() {
  const { apiKey } = useAuth()
  const [stats, setStats] = useState<Stats>({
    connectedCount: 0, totalTools: 0, keyCount: 0, serverOnline: false, loading: true,
  })
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!apiKey) return

    async function fetchStats() {
      try {
        const [health, tools, connected, keys] = await Promise.allSettled([
          api.health(),
          api.tools.list(),
          api.tools.connected(apiKey!),
          api.keys.list(apiKey!),
        ])

        const allTools = tools.status === 'fulfilled' ? tools.value.count : 0
        const connTools = connected.status === 'fulfilled' ? connected.value.tools : []
        const keyList = keys.status === 'fulfilled' ? keys.value.keys : []
        const online = health.status === 'fulfilled'

        // Derive connected providers from tool list
        const providers = new Set(connTools.map(t => t.provider))
        setConnectedProviders(providers)

        setStats({
          connectedCount: providers.size,
          totalTools: allTools,
          keyCount: keyList.length,
          serverOnline: online,
          loading: false,
        })
      } catch {
        setStats(prev => ({ ...prev, loading: false, serverOnline: false }))
      }
    }

    fetchStats()
    // Poll every 15s to pick up changes from CLI or other sessions
    const interval = setInterval(fetchStats, 15000)
    return () => clearInterval(interval)
  }, [apiKey])

  return (
    <div>
      {/* Header */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#ededed]">Overview</h1>
            <p className="text-[13px] text-[#525252] mt-1">Your OpenTool instance at a glance.</p>
          </div>
          <Link href="/docs" target="_blank">
            <Button variant="ghost" size="sm">
              Documentation <ExternalLink size={12} />
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Connected Tools', value: stats.loading ? '—' : String(stats.connectedCount), sub: `of ${Object.keys(PROVIDERS).length} providers`, accent: true },
          { label: 'Available Actions', value: stats.loading ? '—' : String(stats.totalTools), sub: 'across all providers' },
          { label: 'API Keys', value: stats.loading ? '—' : String(stats.keyCount), sub: 'active keys' },
          { label: 'Server Status', value: stats.loading ? '—' : stats.serverOnline ? 'Online' : 'Offline', sub: stats.serverOnline ? 'All systems operational' : 'Cannot reach server' },
        ].map((stat) => (
          <motion.div key={stat.label} variants={fadeUp}>
            <Card className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#525252]">{stat.label}</p>
              {stats.loading ? (
                <Loader2 size={20} className="animate-spin text-[#525252] mt-3" />
              ) : (
                <p className={`text-3xl font-semibold tracking-tight mt-2 ${stat.accent ? 'text-[#06b6d4]' : 'text-[#ededed]'}`}>
                  {stat.value}
                </p>
              )}
              <p className="text-[12px] text-[#525252] mt-1">{stat.sub}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Setup + Server Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <motion.div variants={fadeUp} initial="initial" animate="animate" className="lg:col-span-2">
          <Card highlighted>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-[#ededed]">Get started with OpenTool</h2>
              <Badge variant="accent">Setup Guide</Badge>
            </div>
            <div className="space-y-2.5">
              <SetupStep step={1} title="Connect your first tool" desc="Head to Tools and link a provider like GitHub or Slack" icon={<Wrench size={14} />} done={stats.connectedCount > 0} />
              <SetupStep step={2} title="Generate an API key" desc="Create a key in API Keys to authenticate your agents" icon={<Key size={14} />} done={stats.keyCount > 0} />
              <SetupStep step={3} title="Point your agent" desc="Add OpenTool as an MCP server in Claude Desktop or Cursor" icon={<Zap size={14} />} />
            </div>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} initial="initial" animate="animate">
          <Card className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-[#ededed]">Server</h2>
              <div className="flex items-center gap-1.5">
                {stats.loading ? (
                  <Loader2 size={12} className="animate-spin text-[#525252]" />
                ) : (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${stats.serverOnline ? 'bg-[#22c55e]' : 'bg-[#ef4444]'} opacity-75`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${stats.serverOnline ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                    </span>
                    <span className={`text-[11px] font-medium ${stats.serverOnline ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {stats.serverOnline ? 'Online' : 'Offline'}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <InfoRow label="MCP Endpoint" value="localhost:3001/mcp" />
              <InfoRow label="API Endpoint" value="localhost:3001/api" />
              <InfoRow label="Providers" value={`${Object.keys(PROVIDERS).length} registered`} />
              <InfoRow label="Protocol" value="MCP v1.0" />
            </div>
            <div className="pt-4 mt-4 border-t border-[#1f1f1f] flex items-center gap-2 text-[12px] text-[#525252]">
              <Activity size={12} />
              <span>Self-hosted instance</span>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* MCP Config */}
      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#ededed]">Connect to Claude Desktop</h2>
            <Badge variant="accent">MCP</Badge>
          </div>
          <CodeBlock title="claude_desktop_config.json">{CONFIG_SNIPPET}</CodeBlock>
        </Card>
      </motion.div>

      {/* Tool Providers Preview */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="mt-8">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#ededed]">Tool Providers</h2>
            <Link href="/dashboard/tools">
              <Button variant="ghost" size="sm">Manage tools →</Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {Object.entries(PROVIDERS).map(([key, p]) => {
              const isConnected = connectedProviders.has(key)
              return (
                <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border bg-[#0a0a0a] ${isConnected ? 'border-[rgba(34,197,94,0.3)]' : 'border-[#1f1f1f]'}`}>
                  <p.Icon size={16} className="shrink-0" style={{ color: p.color }} />
                  <span className="text-[12px] font-medium text-[#a1a1aa] truncate">{p.name}</span>
                  {isConnected && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />}
                </div>
              )
            })}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

function SetupStep({ step, title, desc, icon, done }: { step: number; title: string; desc: string; icon: React.ReactNode; done?: boolean }) {
  return (
    <div className={`flex items-start gap-3.5 p-3 rounded-lg border transition-all duration-150 ${done ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.03)]' : 'border-[#1f1f1f] hover:border-[#2e2e2e] hover:bg-[#111113]'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono shrink-0 mt-0.5 ${done ? 'bg-[#22c55e] text-[#0a0a0a] font-bold' : 'bg-[#111111] border border-[#2e2e2e] text-[#525252]'}`}>
        {done ? '✓' : step}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-medium ${done ? 'text-[#a1a1aa] line-through' : 'text-[#ededed]'}`}>{title}</div>
        <div className="text-[12px] text-[#525252] mt-0.5">{desc}</div>
      </div>
      <div className="text-[#525252] mt-1">{icon}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[#525252]">{label}</span>
      <span className="text-[12px] font-mono text-[#a1a1aa]">{value}</span>
    </div>
  )
}
