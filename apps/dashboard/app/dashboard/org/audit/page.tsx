'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Filter, Download } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { orgApi, type OrgAuditEntry } from '@/lib/api'
import { PermissionGate } from '@/components/org/permission-gate'
import { useRouter } from 'next/navigation'

const ACTION_COLORS: Record<string, string> = {
  ORG_CREATED: '#10b981',
  ORG_UPDATED: '#00d4ff',
  ORG_DELETED: '#ef4444',
  ORG_MEMBER_INVITED: '#8b5cf6',
  ORG_MEMBER_JOINED: '#10b981',
  ORG_MEMBER_REMOVED: '#f59e0b',
  ORG_MEMBER_ROLE_CHANGED: '#00d4ff',
  ORG_TEAM_CREATED: '#8b5cf6',
  ORG_TEAM_DELETED: '#ef4444',
  ORG_KEY_CREATED: '#10b981',
  ORG_KEY_REVOKED: '#f59e0b',
  ORG_TOOL_CONNECTED: '#10b981',
  ORG_TOOL_DISCONNECTED: '#f59e0b',
  PERMISSION_DENIED: '#ef4444',
}

function formatAction(action: string): string {
  return action.replace(/^ORG_/, '').replace(/_/g, ' ').toLowerCase()
}

export default function OrgAuditPage() {
  const { apiKey, activeOrg } = useAuth()
  const router = useRouter()
  const [entries, setEntries] = useState<OrgAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionFilter, setActionFilter] = useState('')

  useEffect(() => {
    if (!activeOrg || !apiKey) {
      router.push('/dashboard')
      return
    }
    loadAudit()
  }, [apiKey, activeOrg, page, actionFilter])

  async function loadAudit() {
    if (!apiKey || !activeOrg) return
    setLoading(true)
    try {
      const result = await orgApi.auditLog(apiKey, activeOrg.org.slug, {
        page,
        limit: 25,
        action: actionFilter || undefined,
      })
      setEntries(result.entries)
      setTotalPages(result.pages)
    } catch {
      /* handled */
    }
    setLoading(false)
  }

  function exportCsv() {
    const csv = ['Timestamp,Action,User ID,Target,Status']
      .concat(
        entries.map(
          (e) => `${e.createdAt},${e.action},${e.userId},${e.targetId || ''},${e.status}`,
        ),
      )
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-${activeOrg?.org.slug}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!activeOrg) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#ededed]">Audit Log</h1>
          <p className="text-sm text-[#737373] mt-1">Activity history for {activeOrg.org.name}</p>
        </div>
        <PermissionGate permission="AUDIT_EXPORT">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[rgba(139,92,246,0.15)] text-[#a1a1aa] text-xs hover:bg-[rgba(139,92,246,0.08)] transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </PermissionGate>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-[#737373]">
          <Filter size={14} />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setPage(1)
            }}
            className="bg-[#050510] border border-[rgba(139,92,246,0.15)] rounded-md px-2 py-1 text-xs text-[#ededed] focus:outline-none focus:border-[#8b5cf6]"
          >
            <option value="">All actions</option>
            {Object.keys(ACTION_COLORS).map((a) => (
              <option key={a} value={a}>
                {formatAction(a)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit entries */}
      <div className="bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#737373] text-sm">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-[#737373] text-sm">No audit entries found.</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(139,92,246,0.08)]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#737373] font-medium">
                    Time
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#737373] font-medium">
                    Action
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#737373] font-medium">
                    Actor
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#737373] font-medium">
                    Target
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#737373] font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-[rgba(139,92,246,0.04)] hover:bg-[rgba(139,92,246,0.04)] transition-colors"
                  >
                    <td className="px-4 py-3 text-[10px] text-[#737373] font-mono">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] uppercase px-1.5 py-0.5 rounded font-medium"
                        style={{
                          color: ACTION_COLORS[e.action] || '#737373',
                          background: `${ACTION_COLORS[e.action] || '#737373'}15`,
                        }}
                      >
                        {formatAction(e.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#a1a1aa] font-mono truncate max-w-[120px]">
                      {e.userId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-xs text-[#737373]">
                      {e.targetType ? `${e.targetType}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] ${e.status === 'SUCCESS' ? 'text-[#10b981]' : 'text-red-400'}`}
                      >
                        {e.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(139,92,246,0.08)]">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="text-xs text-[#737373] hover:text-[#ededed] disabled:opacity-40 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-[10px] text-[#737373]">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="text-xs text-[#737373] hover:text-[#ededed] disabled:opacity-40 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
