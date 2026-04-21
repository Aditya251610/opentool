'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, MoreVertical, Shield } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { orgApi, type OrgMember, type OrgRole } from '@/lib/api'
import { PermissionGate, usePermission } from '@/components/org/permission-gate'
import { useRouter } from 'next/navigation'

const ROLE_COLORS: Record<OrgRole, string> = {
  OWNER: '#f59e0b',
  ADMIN: '#8b5cf6',
  MEMBER: '#00d4ff',
  VIEWER: '#737373',
}

export default function OrgMembersPage() {
  const { apiKey, activeOrg } = useAuth()
  const router = useRouter()
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrgRole>('MEMBER')
  const [showInvite, setShowInvite] = useState(false)
  const [error, setError] = useState('')
  const canInvite = usePermission('MEMBERS_INVITE')

  useEffect(() => {
    if (!activeOrg || !apiKey) {
      router.push('/dashboard')
      return
    }
    loadMembers()
  }, [apiKey, activeOrg])

  async function loadMembers() {
    if (!apiKey || !activeOrg) return
    try {
      const { members: m } = await orgApi.members(apiKey, activeOrg.org.slug)
      setMembers(m)
    } catch {
      /* handled */
    }
    setLoading(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey || !activeOrg || !inviteEmail) return
    setError('')
    try {
      await orgApi.invite(apiKey, activeOrg.org.slug, inviteEmail, inviteRole)
      setInviteEmail('')
      setShowInvite(false)
      loadMembers()
    } catch (err: any) {
      setError(err.message || 'Failed to invite')
    }
  }

  async function handleRemove(userId: string) {
    if (!apiKey || !activeOrg) return
    if (!confirm('Remove this member from the organization?')) return
    try {
      await orgApi.removeMember(apiKey, activeOrg.org.slug, userId)
      loadMembers()
    } catch {
      /* handled */
    }
  }

  async function handleRoleChange(userId: string, role: OrgRole) {
    if (!apiKey || !activeOrg) return
    try {
      await orgApi.changeRole(apiKey, activeOrg.org.slug, userId, role)
      loadMembers()
    } catch {
      /* handled */
    }
  }

  if (!activeOrg) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#ededed]">Members</h1>
          <p className="text-sm text-[#737373] mt-1">
            {members.length} members in {activeOrg.org.name}
          </p>
        </div>
        <PermissionGate permission="MEMBERS_INVITE">
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#8b5cf6] text-white text-xs font-medium hover:bg-[#7c3aed] transition-colors"
          >
            <UserPlus size={14} /> Invite
          </button>
        </PermissionGate>
      </div>

      {/* Invite form */}
      {showInvite && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleInvite}
          className="bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-lg p-4 space-y-3"
        >
          <div className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 bg-[#050510] border border-[rgba(139,92,246,0.15)] rounded-md px-3 py-1.5 text-sm text-[#ededed] placeholder:text-[#737373] focus:outline-none focus:border-[#8b5cf6]"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrgRole)}
              className="bg-[#050510] border border-[rgba(139,92,246,0.15)] rounded-md px-3 py-1.5 text-sm text-[#ededed] focus:outline-none focus:border-[#8b5cf6]"
            >
              <option value="VIEWER">Viewer</option>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-[#8b5cf6] text-white text-xs font-medium hover:bg-[#7c3aed]"
            >
              Send Invite
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </motion.form>
      )}

      {/* Members list */}
      <div className="bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#737373] text-sm">Loading…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(139,92,246,0.08)]">
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#737373] font-medium">
                  Member
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#737373] font-medium">
                  Role
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#737373] font-medium">
                  Joined
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.userId}
                  className="border-b border-[rgba(139,92,246,0.04)] hover:bg-[rgba(139,92,246,0.04)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                        style={{ background: ROLE_COLORS[m.role] }}
                      >
                        {(m.name || m.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs text-[#ededed]">{m.name || '—'}</div>
                        <div className="text-[10px] text-[#737373]">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] uppercase px-1.5 py-0.5 rounded"
                      style={{ color: ROLE_COLORS[m.role], background: `${ROLE_COLORS[m.role]}15` }}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#737373]">
                    {new Date(m.joinedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <PermissionGate permission="MEMBERS_REMOVE">
                      {m.role !== 'OWNER' && (
                        <button
                          onClick={() => handleRemove(m.userId)}
                          className="text-[#737373] hover:text-red-400 transition-colors"
                        >
                          <MoreVertical size={14} />
                        </button>
                      )}
                    </PermissionGate>
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
