'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Users, Wrench, Key, Activity } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { orgApi, type OrgMember, type OrgTeam } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function OrgOverview() {
  const { apiKey, activeOrg } = useAuth()
  const router = useRouter()
  const [members, setMembers] = useState<OrgMember[]>([])
  const [teams, setTeams] = useState<OrgTeam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeOrg || !apiKey) {
      router.push('/dashboard')
      return
    }
    async function load() {
      try {
        const [m, t] = await Promise.all([
          orgApi.members(activeOrg!.org.slug),
          orgApi.teams(activeOrg!.org.slug),
        ])
        setMembers(m.members)
        setTeams(t.teams)
      } catch {
        /* handled */
      }
      setLoading(false)
    }
    load()
  }, [apiKey, activeOrg, router])

  if (!activeOrg) return null

  const stats = [
    { label: 'Members', value: members.length, icon: Users, color: '#8b5cf6' },
    { label: 'Teams', value: teams.length, icon: Building2, color: '#00d4ff' },
    { label: 'Plan', value: activeOrg.org.plan, icon: Activity, color: '#10b981' },
    { label: 'Your Role', value: activeOrg.role, icon: Key, color: '#f59e0b' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#ededed]">{activeOrg.org.name}</h1>
        <p className="text-sm text-[#737373] mt-1">Organization overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} style={{ color: stat.color }} />
              <span className="text-[10px] uppercase tracking-wider text-[#737373]">
                {stat.label}
              </span>
            </div>
            <div className="text-lg font-semibold text-[#ededed]">{loading ? '—' : stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent Members */}
      {!loading && members.length > 0 && (
        <div className="bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-[#ededed]">Members</h2>
            <button
              onClick={() => router.push('/dashboard/org/members')}
              className="text-[11px] text-[#8b5cf6] hover:text-[#a78bfa] transition-colors"
            >
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {members.slice(0, 5).map((m) => (
              <div key={m.userId} className="flex items-center gap-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-[#8b5cf6] flex items-center justify-center text-[10px] font-semibold text-white">
                  {(m.name || m.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#ededed] truncate">{m.name || m.email}</div>
                  <div className="text-[10px] text-[#737373] truncate">{m.email}</div>
                </div>
                <span className="text-[10px] uppercase text-[#737373] bg-[rgba(139,92,246,0.08)] px-1.5 py-0.5 rounded">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teams */}
      {!loading && teams.length > 0 && (
        <div className="bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-[#ededed]">Teams</h2>
            <button
              onClick={() => router.push('/dashboard/org/teams')}
              className="text-[11px] text-[#8b5cf6] hover:text-[#a78bfa] transition-colors"
            >
              View all →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {teams.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-2 rounded-md bg-[rgba(139,92,246,0.04)] border border-[rgba(139,92,246,0.08)]"
              >
                <Wrench size={12} className="text-[#737373]" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#ededed] truncate">{t.name}</div>
                </div>
                <span className="text-[10px] text-[#737373]">{t.memberCount} members</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
