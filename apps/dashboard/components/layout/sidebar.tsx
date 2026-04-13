'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, Wrench, Key, Settings, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { OpenToolLogo } from '@/components/icons'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/dashboard/tools', label: 'Tools', icon: Wrench },
  { href: '/dashboard/keys', label: 'API Keys', icon: Key },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const initial = user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'

  const navContent = (
    <>
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: [0.0, 0.0, 0.2, 1.0] }}
        className="flex items-center gap-2.5 px-2 mb-6"
      >
        <OpenToolLogo className="h-4 w-auto" />
        <span className="ml-auto text-[10px] font-mono text-[#525252] bg-[#111111] border border-[#1f1f1f] px-1.5 py-0.5 rounded">
          v0.0.1
        </span>
      </motion.div>

      {/* Section label */}
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#525252] px-2 mb-2">
        Platform
      </div>

      {/* Nav items */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={{ animate: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } }}
        className="flex flex-col gap-0.5"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          return (
            <motion.div
              key={item.href}
              variants={{
                initial: { opacity: 0, x: -8 },
                animate: { opacity: 1, x: 0, transition: { duration: 0.15 } },
              }}
            >
              <Link href={item.href} onClick={() => setMobileOpen(false)}>
                <div className="relative flex items-center gap-2.5 h-10 md:h-8 px-2 rounded-md">
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-[rgba(0,112,243,0.08)] rounded-md border border-[rgba(0,112,243,0.15)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                  )}
                  <item.icon
                    size={15}
                    className={`relative z-10 ${isActive ? 'text-[#0070F3]' : 'text-[#525252]'}`}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  <span className={`text-[13px] relative z-10 ${
                    isActive ? 'text-[#ededed] font-medium' : 'text-[#a1a1aa]'
                  }`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Bottom — user info */}
      <div className="mt-auto pt-4 border-t border-[#1f1f1f]">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 rounded-full bg-[#0070F3] flex items-center justify-center text-[11px] font-semibold text-white">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-[#ededed] truncate">{user?.name || user?.email || 'User'}</div>
            <div className="text-[10px] text-[#525252] truncate">Self-hosted</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 rounded-md hover:bg-[#1a1a1a] transition-colors text-[#525252] hover:text-[#a1a1aa] cursor-pointer"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0a0a0a] border-b border-[#1f1f1f] flex items-center justify-between px-4 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <OpenToolLogo className="h-4 w-auto" />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2.5 -mr-1 rounded-md hover:bg-[#1a1a1a] transition-colors text-[#a1a1aa] cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="md:hidden w-60 h-screen fixed left-0 top-0 flex flex-col border-r border-[#1f1f1f] bg-[#0a0a0a] px-3 py-4 z-50"
            >
              {navContent}
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <nav className="hidden md:flex w-60 h-screen fixed left-0 top-0 flex-col border-r border-[#1f1f1f] bg-[#0a0a0a] px-3 py-4 z-50">
        {navContent}
      </nav>
    </>
  )
}
