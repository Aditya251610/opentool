'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, ChevronDown, Plus, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { FEATURES } from '@/lib/api'

export function OrgSwitcher() {
  const { orgs, activeOrg, switchOrg, clearOrg } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!FEATURES.ORGS_ENABLED || orgs.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-left
          hover:bg-[rgba(139,92,246,0.08)] transition-colors border border-transparent
          hover:border-[rgba(139,92,246,0.15)]"
      >
        <Building2 className="h-3.5 w-3.5 text-[#8b5cf6]" />
        <span className="flex-1 truncate text-[#e2e2e2]">
          {activeOrg ? activeOrg.org.name : 'Personal'}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-[#737373] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-[rgba(139,92,246,0.15)]
              bg-[#0a0a1a] shadow-lg shadow-black/40 overflow-hidden"
          >
            {/* Personal workspace */}
            <button
              onClick={() => {
                clearOrg()
                setOpen(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[rgba(139,92,246,0.08)] transition-colors"
            >
              <span className="flex-1 text-[#e2e2e2]">Personal</span>
              {!activeOrg && <Check className="h-3.5 w-3.5 text-[#8b5cf6]" />}
            </button>

            <div className="h-px bg-[rgba(139,92,246,0.1)] mx-2" />

            {/* Org list */}
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  switchOrg(org.slug)
                  setOpen(false)
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[rgba(139,92,246,0.08)] transition-colors"
              >
                <span className="flex-1 truncate text-[#e2e2e2]">{org.name}</span>
                <span className="text-[10px] text-[#737373] uppercase">{org.role}</span>
                {activeOrg?.org.slug === org.slug && (
                  <Check className="h-3.5 w-3.5 text-[#8b5cf6]" />
                )}
              </button>
            ))}

            <div className="h-px bg-[rgba(139,92,246,0.1)] mx-2" />

            {/* Create new */}
            <button
              onClick={() => {
                setOpen(false)
                window.location.href = '/dashboard/org/new'
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[rgba(139,92,246,0.08)] transition-colors text-[#737373]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create organization</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
