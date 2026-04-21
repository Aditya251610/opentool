'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { orgApi, type OrgTeam } from '@/lib/api'
import { PermissionGate } from '@/components/org/permission-gate'
import { useRouter } from 'next/navigation'

export default function OrgTeamsPage() {
  const { apiKey, activeOrg } = useAuth()
  const router = useRouter()
  const [teams, setTeams] = useState<OrgTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeOrg || !apiKey) {
      router.push('/dashboard')
      return
    }
    loadTeams()
  }, [apiKey, activeOrg])

  async function loadTeams() {
    if (!apiKey || !activeOrg) return
    try {
      const { teams: t } = await orgApi.teams(apiKey, activeOrg.org.slug)
      setTeams(t)
    } catch {
      /* handled */
    }
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey || !activeOrg) return
    setError('')
    try {
      await orgApi.createTeam(apiKey, activeOrg.org.slug, name, slug, desc || undefined)
      setName('')
      setSlug('')
      setDesc('')
      setShowCreate(false)
      loadTeams()
    } catch (err: any) {
      setError(err.message || 'Failed to create team')
    }
  }

  async function handleDelete(teamSlug: string) {
    if (!apiKey || !activeOrg) return
    if (!confirm('Delete this team?')) return
    try {
      await orgApi.deleteTeam(apiKey, activeOrg.org.slug, teamSlug)
      loadTeams()
    } catch {
      /* handled */
    }
  }

  if (!activeOrg) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#ededed]">Teams</h1>
          <p className="text-sm text-[#737373] mt-1">Manage teams in {activeOrg.org.name}</p>
        </div>
        <PermissionGate permission="TEAMS_MANAGE">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#8b5cf6] text-white text-xs font-medium hover:bg-[#7c3aed] transition-colors"
          >
            <Plus size={14} /> New Team
          </button>
        </PermissionGate>
      </div>

      {/* Create form */}
      {showCreate && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleCreate}
          className="bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-lg p-4 space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
              }}
              placeholder="Team name"
              className="bg-[#050510] border border-[rgba(139,92,246,0.15)] rounded-md px-3 py-1.5 text-sm text-[#ededed] placeholder:text-[#737373] focus:outline-none focus:border-[#8b5cf6]"
              required
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="team-slug"
              className="bg-[#050510] border border-[rgba(139,92,246,0.15)] rounded-md px-3 py-1.5 text-sm text-[#ededed] placeholder:text-[#737373] focus:outline-none focus:border-[#8b5cf6]"
              required
            />
          </div>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-[#050510] border border-[rgba(139,92,246,0.15)] rounded-md px-3 py-1.5 text-sm text-[#ededed] placeholder:text-[#737373] focus:outline-none focus:border-[#8b5cf6]"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-[#8b5cf6] text-white text-xs font-medium hover:bg-[#7c3aed]"
            >
              Create Team
            </button>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        </motion.form>
      )}

      {/* Teams grid */}
      {loading ? (
        <div className="text-center text-[#737373] text-sm py-8">Loading…</div>
      ) : teams.length === 0 ? (
        <div className="text-center text-[#737373] text-sm py-8">
          No teams yet. Create one to organize members.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-lg p-4 group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[#ededed]">{t.name}</h3>
                  <p className="text-[10px] text-[#737373] font-mono mt-0.5">{t.slug}</p>
                </div>
                <PermissionGate permission="TEAMS_MANAGE">
                  <button
                    onClick={() => handleDelete(t.slug)}
                    className="text-[#737373] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </PermissionGate>
              </div>
              {t.description && (
                <p className="text-xs text-[#a1a1aa] mt-2 line-clamp-2">{t.description}</p>
              )}
              <div className="flex items-center gap-1.5 mt-3 text-[#737373]">
                <Users size={12} />
                <span className="text-[10px]">{t.memberCount} members</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
