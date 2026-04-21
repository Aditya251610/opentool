'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { orgApi } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function CreateOrgPage() {
  const { apiKey, refreshOrgs, switchOrg } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey || !name || !slug) return
    setError('')
    setCreating(true)
    try {
      await orgApi.create(name, slug)
      await refreshOrgs()
      switchOrg(slug)
      router.push('/dashboard/org')
    } catch (err: any) {
      setError(err.message || 'Failed to create organization')
    }
    setCreating(false)
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] rounded-lg p-6 space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[rgba(139,92,246,0.1)] flex items-center justify-center">
            <Building2 size={20} className="text-[#8b5cf6]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#ededed]">Create Organization</h1>
            <p className="text-xs text-[#737373]">Set up a new workspace for your team</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#737373] block mb-1.5">
              Organization Name
            </label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-]/g, '-')) {
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '-')
                      .replace(/-+/g, '-')
                      .replace(/^-|-$/g, ''),
                  )
                }
              }}
              placeholder="My Team"
              className="w-full bg-[#050510] border border-[rgba(139,92,246,0.15)] rounded-md px-3 py-2 text-sm text-[#ededed] placeholder:text-[#737373] focus:outline-none focus:border-[#8b5cf6]"
              required
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#737373] block mb-1.5">
              URL Slug
            </label>
            <div className="flex items-center">
              <span className="text-xs text-[#737373] mr-1">opentool.dev/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="my-team"
                className="flex-1 bg-[#050510] border border-[rgba(139,92,246,0.15)] rounded-md px-3 py-2 text-sm text-[#ededed] placeholder:text-[#737373] focus:outline-none focus:border-[#8b5cf6] font-mono"
                required
                pattern="[a-z0-9-]+"
              />
            </div>
            <p className="text-[10px] text-[#737373] mt-1">
              Lowercase letters, numbers, and hyphens only.
            </p>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-400/10 rounded px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={creating || !name || !slug}
            className="w-full px-4 py-2 rounded-md bg-[#8b5cf6] text-white text-sm font-medium hover:bg-[#7c3aed] disabled:opacity-50 transition-colors"
          >
            {creating ? 'Creating…' : 'Create Organization'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
