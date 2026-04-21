'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wrench, Link, Unlink } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api, type Tool } from '@/lib/api'
import { PermissionGate } from '@/components/org/permission-gate'
import { useRouter } from 'next/navigation'

export default function OrgToolsPage() {
  const { apiKey, activeOrg } = useAuth()
  const router = useRouter()
  const [tools, setTools] = useState<Tool[]>([])
  const [connected, setConnected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeOrg || !apiKey) {
      router.push('/dashboard')
      return
    }
    loadTools()
  }, [apiKey, activeOrg])

  async function loadTools() {
    if (!apiKey) return
    try {
      const [all, conn] = await Promise.all([api.tools.list(), api.tools.connected(apiKey)])
      setTools(all.tools)
      setConnected(new Set(conn.tools.map((t) => t.provider)))
    } catch {
      /* handled */
    }
    setLoading(false)
  }

  if (!activeOrg) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#ededed]">Organization Tools</h1>
        <p className="text-sm text-[#737373] mt-1">
          Shared tool connections for {activeOrg.org.name}
        </p>
      </div>

      {loading ? (
        <div className="text-center text-[#737373] text-sm py-8">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((t, i) => {
            const isConnected = connected.has(t.provider)
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-lg p-4 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench size={14} className="text-[#8b5cf6]" />
                    <h3 className="text-sm font-medium text-[#ededed]">{t.name}</h3>
                  </div>
                  {isConnected && (
                    <span className="text-[10px] text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded">
                      Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#737373] mt-2 line-clamp-2">{t.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-[#737373] font-mono">{t.provider}</span>
                  <PermissionGate anyOf={['TOOLS_CONNECT', 'TOOLS_DISCONNECT']}>
                    <button className="flex items-center gap-1 text-[10px] text-[#8b5cf6] hover:text-[#a78bfa] transition-colors opacity-0 group-hover:opacity-100">
                      {isConnected ? (
                        <>
                          <Unlink size={10} /> Disconnect
                        </>
                      ) : (
                        <>
                          <Link size={10} /> Connect
                        </>
                      )}
                    </button>
                  </PermissionGate>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
