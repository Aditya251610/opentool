'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { OpenToolLogo } from '@/components/icons'
import { Button } from '@/components/ui/button'

const ease: [number, number, number, number] = [0.23, 1, 0.32, 1]

const ROLE_COLORS: Record<string, string> = {
  OWNER: '#00d4ff',
  ADMIN: '#8b5cf6',
  MEMBER: 'rgba(255,255,255,0.6)',
  VIEWER: 'rgba(255,255,255,0.35)',
}

export default function OrgSelectPage() {
  const { orgs, switchOrg, clearOrg, user } = useAuth()
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    if (orgs.length === 0) {
      router.push('/dashboard')
    } else if (orgs.length === 1) {
      switchOrg(orgs[0].slug)
      router.push('/dashboard')
    }
  }, [user, orgs, router, switchOrg])

  function handleSelect(slug: string | null) {
    setSelected(slug)
    if (slug) {
      switchOrg(slug)
    } else {
      clearOrg()
    }
    router.push('/dashboard')
  }

  if (!user || orgs.length <= 1) return null

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <OpenToolLogo className="h-8" />
        </div>

        {/* Card */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0d0d24]/80 backdrop-blur-sm p-6">
          <h1 className="text-lg font-semibold text-white mb-1">Choose workspace</h1>
          <p className="text-sm text-white/40 mb-6">
            Welcome back, {user.name || user.email}. Select a workspace to continue.
          </p>

          {/* Org list */}
          <div className="space-y-2 mb-4">
            {orgs.map((org, i) => (
              <motion.button
                key={org.slug}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => handleSelect(org.slug)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[rgba(0,212,255,0.3)] hover:bg-[rgba(0,212,255,0.03)] transition-all group"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.15)] flex items-center justify-center text-[#00d4ff] text-sm font-bold uppercase">
                  {org.name.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm text-white font-medium group-hover:text-[#00d4ff] transition-colors">
                    {org.name}
                  </p>
                  <p className="text-[11px] text-white/30">{org.memberCount || 0} members</p>
                </div>
                <span
                  className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border"
                  style={{
                    color: ROLE_COLORS[(org as any).role] || ROLE_COLORS.MEMBER,
                    borderColor: `${ROLE_COLORS[(org as any).role] || ROLE_COLORS.MEMBER}33`,
                  }}
                >
                  {(org as any).role || 'member'}
                </span>
              </motion.button>
            ))}

            {/* Personal option */}
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + orgs.length * 0.05 }}
              onClick={() => handleSelect(null)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.02)] transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-white/50 text-sm">
                ⌂
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-white/70 font-medium group-hover:text-white transition-colors">
                  Personal
                </p>
                <p className="text-[11px] text-white/25">No organization</p>
              </div>
            </motion.button>
          </div>

          {/* Create org link */}
          <div className="pt-3 border-t border-[rgba(255,255,255,0.06)]">
            <Link
              href="/dashboard/org/new"
              className="flex items-center gap-2 text-xs text-white/40 hover:text-[#00d4ff] transition-colors"
            >
              <span className="text-base">+</span> Create new organization
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
