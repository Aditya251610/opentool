'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { GitHubIcon } from '@/components/icons'

const ease: [number, number, number, number] = [0.23, 1, 0.32, 1]

interface ChangelogSection {
  title: string
  items: string[]
}

interface ChangelogEntry {
  version: string
  date: string | null
  isUnreleased: boolean
  sections: ChangelogSection[]
}

/* ─── Category badge colors ─── */

const CATEGORY_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  Added: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  Fixed: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  Security: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  Changed: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  Removed: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  Deprecated: { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400' },
}

const DEFAULT_STYLE = { bg: 'bg-white/5', text: 'text-white/60', dot: 'bg-white/40' }

function getCategoryStyle(title: string) {
  return CATEGORY_STYLE[title] || DEFAULT_STYLE
}

/* ─── Animated entry card ─── */

function EntryCard({ entry, index }: { entry: ChangelogEntry; index: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  const formattedDate = entry.date
    ? new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: Math.min(index * 0.08, 0.3), duration: 0.6, ease }}
      className="relative pl-8 md:pl-12 pb-12 last:pb-0"
    >
      {/* Timeline dot */}
      <div
        className={`absolute left-0 md:left-2 top-1.5 w-3 h-3 rounded-full border-2 ${
          entry.isUnreleased ? 'border-white/20 bg-transparent' : 'border-brand bg-brand/20'
        }`}
      />

      {/* Version + date header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            entry.isUnreleased
              ? 'bg-white/[0.06] text-white/50 border border-white/[0.08]'
              : 'bg-brand/15 text-brand border border-brand/25'
          }`}
        >
          {entry.isUnreleased ? 'Unreleased' : `v${entry.version}`}
        </span>
        {formattedDate && <span className="text-xs text-white/30">{formattedDate}</span>}
        {!entry.isUnreleased && (
          <Link
            href={`https://github.com/Aditya251610/opentool/releases/tag/cli-v${entry.version}`}
            target="_blank"
            className="text-xs text-white/20 hover:text-white/50 transition-colors"
          >
            View release →
          </Link>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-5">
        {entry.sections.map((section) => {
          const style = getCategoryStyle(section.title)
          return (
            <div key={section.title}>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium ${style.bg} ${style.text} mb-3`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                {section.title}
              </span>
              <ul className="space-y-1.5 ml-1">
                {section.items.map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-white/50 leading-relaxed">
                    <span className="text-white/15 mt-[7px] flex-shrink-0">•</span>
                    <span dangerouslySetInnerHTML={{ __html: formatItem(item) }} />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </motion.article>
  )
}

/* Format bold markers: **text** → <strong> */
function formatItem(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white/70 font-medium">$1</strong>')
}

/* ─── Main content ─── */

export function ChangelogContent({ entries }: { entries: ChangelogEntry[] }) {
  return (
    <div className="min-h-screen text-white">
      <Navbar activePage="/changelog" />

      {/* Header */}
      <section className="relative pt-32 pb-12 md:pt-40 md:pb-16 px-6">
        <div className="absolute inset-0 hero-glow pointer-events-none opacity-30" />
        <div className="relative z-10 max-w-[680px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
          >
            <h1 className="text-[32px] md:text-[48px] font-bold tracking-[-0.03em] mb-4">
              Changelog
            </h1>
            <p className="text-base md:text-lg text-white/40 leading-relaxed max-w-[520px]">
              Every update to OpenTool — new integrations, bug fixes, and security improvements.
              Sourced live from{' '}
              <Link
                href="https://github.com/Aditya251610/opentool/blob/main/CHANGELOG.md"
                target="_blank"
                className="text-brand/80 hover:text-brand transition-colors underline underline-offset-2 decoration-brand/30"
              >
                GitHub
              </Link>
              .
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease }}
            className="flex items-center gap-4 mt-8"
          >
            <Link
              href="https://github.com/Aditya251610/opentool/blob/main/CHANGELOG.md"
              target="_blank"
              className="inline-flex items-center gap-2 h-[38px] px-5 rounded-lg border border-white/[0.1] text-xs text-white/60 hover:text-white hover:border-white/[0.2] hover:bg-white/[0.03] transition-all duration-200"
            >
              <GitHubIcon size={15} />
              View on GitHub
            </Link>
            <span className="text-xs text-white/20">Auto-synced · Refreshes every 5 min</span>
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-[680px] mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* Timeline */}
      <section className="relative py-12 md:py-20 px-6">
        <div className="max-w-[680px] mx-auto relative">
          {/* Timeline line */}
          <div className="absolute left-[5px] md:left-[11px] top-0 bottom-0 w-px bg-white/[0.06]" />

          {entries.length > 0 ? (
            entries.map((entry, i) => <EntryCard key={entry.version} entry={entry} index={i} />)
          ) : (
            <div className="pl-8 md:pl-12 py-20 text-center">
              <p className="text-white/30 text-sm">No changelog entries found. Check back soon.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
