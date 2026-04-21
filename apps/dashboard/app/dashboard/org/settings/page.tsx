'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { orgApi } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function OrgSettingsPage() {
  const { apiKey, activeOrg, refreshOrgs } = useAuth()
  const router = useRouter()
  const [name, setName] = useState(activeOrg?.org.name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!activeOrg) {
    router.push('/dashboard')
    return null
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey || !activeOrg) return
    setSaving(true)
    try {
      await orgApi.update(activeOrg.org.slug, { name })
      await refreshOrgs()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      /* handled */
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!apiKey || !activeOrg) return
    const confirm1 = prompt(`Type "${activeOrg.org.slug}" to permanently delete this organization:`)
    if (confirm1 !== activeOrg.org.slug) return
    setDeleting(true)
    try {
      await orgApi.delete(activeOrg.org.slug)
      await refreshOrgs()
      router.push('/dashboard')
    } catch {
      /* handled */
    }
    setDeleting(false)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-[#ededed]">Organization Settings</h1>
        <p className="text-sm text-[#737373] mt-1">Manage {activeOrg.org.name} settings</p>
      </div>

      {/* General */}
      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSave}
        className="bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-lg p-6 space-y-4"
      >
        <h2 className="text-sm font-medium text-[#ededed]">General</h2>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#737373] block mb-1.5">
            Organization Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#050510] border border-[rgba(139,92,246,0.15)] rounded-md px-3 py-2 text-sm text-[#ededed] focus:outline-none focus:border-[#8b5cf6]"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#737373] block mb-1.5">
            Slug
          </label>
          <input
            value={activeOrg.org.slug}
            disabled
            className="w-full bg-[#050510] border border-[rgba(139,92,246,0.08)] rounded-md px-3 py-2 text-sm text-[#737373] cursor-not-allowed"
          />
          <p className="text-[10px] text-[#737373] mt-1">Slug cannot be changed after creation.</p>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#737373] block mb-1.5">
            Plan
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#ededed] capitalize">{activeOrg.org.plan}</span>
            <span className="text-[10px] text-[#8b5cf6] bg-[rgba(139,92,246,0.08)] px-1.5 py-0.5 rounded">
              Current
            </span>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-1.5 rounded-md bg-[#8b5cf6] text-white text-xs font-medium hover:bg-[#7c3aed] disabled:opacity-50 transition-colors"
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
        </button>
      </motion.form>

      {/* Danger Zone */}
      <div className="bg-[#0d0d24] border border-red-500/20 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-medium text-red-400">Danger Zone</h2>
        <p className="text-xs text-[#737373]">
          Deleting this organization will permanently remove all members, teams, keys, and
          associated data. This action cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-1.5 rounded-md border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 disabled:opacity-50 transition-colors"
        >
          {deleting ? 'Deleting…' : 'Delete Organization'}
        </button>
      </div>
    </div>
  )
}
