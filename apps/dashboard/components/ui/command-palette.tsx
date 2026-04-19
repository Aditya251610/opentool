'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid,
  Wrench,
  Key,
  Settings,
  FileText,
  ExternalLink,
  Plus,
  Search,
  ArrowRight,
  Command,
} from 'lucide-react'
import { GitHubIcon } from '@/components/icons'

/* ─── Types ─── */

interface CommandItem {
  id: string
  label: string
  group: string
  icon: React.ReactNode
  shortcut?: string[]
  action: () => void
  keywords?: string[]
}

/* ─── Fuzzy match ─── */

function fuzzyMatch(query: string, text: string): { match: boolean; score: number } {
  const q = query.toLowerCase()
  const t = text.toLowerCase()

  if (t.includes(q)) return { match: true, score: t.indexOf(q) === 0 ? 100 : 80 }

  let qi = 0
  let score = 0
  let consecutive = 0

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += consecutive > 0 ? 15 : 10
      consecutive++
      qi++
    } else {
      consecutive = 0
    }
  }

  return { match: qi === q.length, score }
}

/* ─── Component ─── */

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])

  const commands = useMemo<CommandItem[]>(
    () => [
      // Navigation
      {
        id: 'nav-overview',
        label: 'Go to Overview',
        group: 'Navigation',
        icon: <LayoutGrid size={16} />,
        shortcut: ['G', 'O'],
        action: () => {
          router.push('/dashboard')
          close()
        },
        keywords: ['home', 'dashboard', 'overview'],
      },
      {
        id: 'nav-tools',
        label: 'Go to Tools',
        group: 'Navigation',
        icon: <Wrench size={16} />,
        shortcut: ['G', 'T'],
        action: () => {
          router.push('/dashboard/tools')
          close()
        },
        keywords: ['tools', 'integrations', 'providers', 'connect'],
      },
      {
        id: 'nav-keys',
        label: 'Go to API Keys',
        group: 'Navigation',
        icon: <Key size={16} />,
        shortcut: ['G', 'K'],
        action: () => {
          router.push('/dashboard/keys')
          close()
        },
        keywords: ['keys', 'api', 'tokens', 'authentication'],
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        group: 'Navigation',
        icon: <Settings size={16} />,
        shortcut: ['G', 'S'],
        action: () => {
          router.push('/dashboard/settings')
          close()
        },
        keywords: ['settings', 'profile', 'account', 'preferences'],
      },
      // Actions
      {
        id: 'action-new-key',
        label: 'Create API Key',
        group: 'Actions',
        icon: <Plus size={16} />,
        action: () => {
          router.push('/dashboard/keys?create=1')
          close()
        },
        keywords: ['new', 'create', 'generate', 'key'],
      },
      {
        id: 'action-connect',
        label: 'Connect a Tool',
        group: 'Actions',
        icon: <Wrench size={16} />,
        action: () => {
          router.push('/dashboard/tools?filter=available')
          close()
        },
        keywords: ['connect', 'add', 'oauth', 'provider'],
      },
      // Links
      {
        id: 'link-docs',
        label: 'Documentation',
        group: 'Links',
        icon: <FileText size={16} />,
        action: () => {
          window.open('/docs', '_blank')
          close()
        },
        keywords: ['docs', 'documentation', 'guide', 'help'],
      },
      {
        id: 'link-github',
        label: 'GitHub Repository',
        group: 'Links',
        icon: <GitHubIcon size={16} />,
        action: () => {
          window.open('https://github.com/Aditya251610/opentool', '_blank')
          close()
        },
        keywords: ['github', 'source', 'repo', 'code', 'star'],
      },
    ],
    [router, close],
  )

  // Filter + rank
  const filtered = useMemo(() => {
    if (!query.trim()) return commands

    return commands
      .map((cmd) => {
        const labelResult = fuzzyMatch(query, cmd.label)
        const kwResults = (cmd.keywords || []).map((kw) => fuzzyMatch(query, kw))
        const bestKw = kwResults.reduce((best, r) => (r.score > best.score ? r : best), {
          match: false,
          score: 0,
        })
        const best = labelResult.score >= bestKw.score ? labelResult : bestKw
        return { cmd, ...best }
      })
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.cmd)
  }, [commands, query])

  // Group results
  const grouped = useMemo(() => {
    const groups: { name: string; items: CommandItem[] }[] = []
    const seen = new Set<string>()

    for (const cmd of filtered) {
      if (!seen.has(cmd.group)) {
        seen.add(cmd.group)
        groups.push({ name: cmd.group, items: [] })
      }
      groups.find((g) => g.name === cmd.group)!.items.push(cmd)
    }
    return groups
  }, [filtered])

  // Flat list for keyboard nav
  const flatItems = useMemo(() => filtered, [filtered])

  // Global shortcut: Cmd+K / Ctrl+K, or custom toggle event
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        close()
      }
    }
    function onToggle() {
      setOpen((prev) => !prev)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('toggle-command-palette', onToggle)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('toggle-command-palette', onToggle)
    }
  }, [open, close])

  // G-key sequences (only when palette is closed)
  useEffect(() => {
    if (open) return

    let gPressed = false
    let timer: ReturnType<typeof setTimeout>

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        return

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        if (!gPressed) {
          gPressed = true
          timer = setTimeout(() => {
            gPressed = false
          }, 800)
          return
        }
      }

      if (gPressed) {
        gPressed = false
        clearTimeout(timer)
        const map: Record<string, string> = {
          o: 'nav-overview',
          t: 'nav-tools',
          k: 'nav-keys',
          s: 'nav-settings',
        }
        const cmd = commands.find((c) => c.id === map[e.key])
        if (cmd) {
          e.preventDefault()
          cmd.action()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, commands])

  // Focus input on open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Reset active index on filter change
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % flatItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length)
    } else if (e.key === 'Enter' && flatItems[activeIndex]) {
      e.preventDefault()
      flatItems[activeIndex].action()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={close}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="fixed left-1/2 top-[20%] -translate-x-1/2 w-[90vw] max-w-[520px] z-[101] rounded-xl border border-white/[0.08] bg-[#0a0a1a] shadow-[0_25px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 h-[52px] border-b border-white/[0.06]">
              <Search size={16} className="text-white/25 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden sm:flex items-center gap-0.5 h-5 px-1.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-white/30">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2 overscroll-contain">
              {flatItems.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-white/30">No results for &ldquo;{query}&rdquo;</p>
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.name}>
                    <div className="px-4 pt-3 pb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/20">
                        {group.name}
                      </span>
                    </div>
                    {group.items.map((item) => {
                      const idx = flatItems.indexOf(item)
                      const isActive = idx === activeIndex
                      return (
                        <button
                          key={item.id}
                          data-index={idx}
                          onClick={item.action}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 h-10 text-left transition-colors duration-75 ${
                            isActive
                              ? 'bg-brand/[0.08] text-white'
                              : 'text-white/50 hover:text-white/70'
                          }`}
                        >
                          <span className={`shrink-0 ${isActive ? 'text-brand' : 'text-white/30'}`}>
                            {item.icon}
                          </span>
                          <span className="flex-1 text-xs truncate">{item.label}</span>
                          {item.shortcut && (
                            <span className="hidden sm:flex items-center gap-0.5 shrink-0">
                              {item.shortcut.map((k, i) => (
                                <kbd
                                  key={i}
                                  className="h-5 min-w-[20px] px-1 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-white/25 flex items-center justify-center"
                                >
                                  {k}
                                </kbd>
                              ))}
                            </span>
                          )}
                          {isActive && <ArrowRight size={12} className="text-brand/50 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 px-4 h-9 border-t border-white/[0.04] text-[10px] text-white/15">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">
                  ↑↓
                </kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">
                  ↵
                </kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">
                  esc
                </kbd>
                close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ─── Keyboard hint button (for sidebar) ─── */

export function CommandPaletteHint() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
      className="group w-full flex items-center gap-2.5 h-8 px-2 rounded-md text-[#737373] hover:text-[#a1a1aa] hover:bg-white/[0.03] transition-colors cursor-pointer"
      aria-label="Open command palette"
    >
      <Search size={15} strokeWidth={1.5} />
      <span className="text-xs">Search</span>
      <kbd className="ml-auto flex items-center gap-0.5 h-5 px-1.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-white/20 group-hover:text-white/30 transition-colors">
        <Command size={10} />K
      </kbd>
    </button>
  )
}
