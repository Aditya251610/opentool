'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useGitHubStars } from '@/lib/github-stars'
import { OpenToolLogo, OpenToolMark, GitHubIcon } from '@/components/icons'

const ease: [number, number, number, number] = [0.23, 1, 0.32, 1]

const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'Integrations', href: '/#tools' },
  { label: 'Docs', href: '/docs' },
  { label: 'Changelog', href: '/changelog' },
]

interface NavbarProps {
  activePage?: string
  animate?: boolean
}

export function Navbar({ activePage, animate = false }: NavbarProps) {
  const { apiKey } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const stars = useGitHubStars()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const Tag = animate ? motion.nav : 'nav'
  const motionProps = animate
    ? {
        initial: { y: -20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: 0.5, ease },
      }
    : {}

  return (
    <Tag
      {...motionProps}
      className="fixed top-0 left-0 right-0 z-50 h-[64px] flex items-center justify-between px-6 md:px-10 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(3,0,20,0.9)' : animate ? 'transparent' : 'rgba(3,0,20,0.75)',
        backdropFilter: scrolled ? 'blur(24px) saturate(180%)' : animate ? 'none' : 'blur(16px)',
        borderBottom: scrolled ? '1px solid rgba(139,92,246,0.1)' : '1px solid transparent',
      }}
    >
      <Link href="/" className="flex items-center gap-2 group">
        <OpenToolMark
          size={24}
          className="transition-transform duration-300 group-hover:scale-110"
        />
        <OpenToolLogo className="h-5 w-auto" />
      </Link>

      <div className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map(({ label, href }) => {
          const isActive = activePage === href
          return (
            <Link
              key={label}
              href={href}
              className={`relative px-4 py-2 text-xs transition-colors duration-200 group ${
                isActive ? 'text-white font-medium' : 'text-white/50 hover:text-white'
              }`}
            >
              {label}
              <span
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-px bg-brand transition-all duration-300 ${
                  isActive ? 'w-4/5' : 'w-0 group-hover:w-4/5'
                }`}
              />
            </Link>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="https://github.com/Aditya251610/opentool"
          target="_blank"
          className="hidden sm:flex items-center gap-1.5 h-[34px] px-3.5 rounded-lg border border-white/[0.08] text-xs text-white/50 hover:text-white hover:border-white/[0.18] hover:bg-white/[0.03] transition-all duration-200"
        >
          <GitHubIcon size={14} />
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-brand"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {stars !== null ? stars : 'Star'}
        </Link>
        <Link
          href={apiKey ? '/dashboard' : '/signup'}
          className="h-[34px] px-5 rounded-lg bg-brand text-black text-xs font-semibold inline-flex items-center hover:bg-brand-hover transition-all duration-200 shadow-[0_2px_20px_rgba(0,212,255,0.25)] hover:shadow-[0_4px_30px_rgba(0,212,255,0.4)] hover:-translate-y-[1px]"
        >
          {apiKey ? 'Dashboard' : 'Get Started'} →
        </Link>
      </div>
    </Tag>
  )
}
