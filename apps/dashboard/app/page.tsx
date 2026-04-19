'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  motion,
  useInView,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/layout/navbar'
import {
  GitHubIcon,
  NotionIcon,
  SlackIcon,
  LinearIcon,
  GmailIcon,
  GoogleCalendarIcon,
  StripeIcon,
  VercelIcon,
  ResendIcon,
  NeonIcon,
} from '@/components/icons'

const ParallaxStars = dynamic(() => import('@/components/landing/parallax-stars'), { ssr: false })
const TextScramble = dynamic(() => import('@/components/landing/text-scramble'))
const MagneticButton = dynamic(() => import('@/components/landing/magnetic-button'))
const FloatingLogos = dynamic(() => import('@/components/landing/floating-logos'), { ssr: false })
const CursorNebula = dynamic(() => import('@/components/landing/cursor-nebula'), { ssr: false })
const Footer = dynamic(() =>
  import('@/components/layout/footer').then((m) => ({ default: m.Footer })),
)

/* ─── Constants ─── */
const ease: [number, number, number, number] = [0.23, 1, 0.32, 1]

const TOOLS: { name: string; Icon: typeof GitHubIcon; tools: number; accent: string }[] = [
  { name: 'GitHub', Icon: GitHubIcon, tools: 5, accent: '#f0f0f0' },
  { name: 'Notion', Icon: NotionIcon, tools: 3, accent: '#f0f0f0' },
  { name: 'Slack', Icon: SlackIcon, tools: 2, accent: '#E01E5A' },
  { name: 'Linear', Icon: LinearIcon, tools: 2, accent: '#5E6AD2' },
  { name: 'Gmail', Icon: GmailIcon, tools: 3, accent: '#EA4335' },
  { name: 'Google Cal', Icon: GoogleCalendarIcon, tools: 2, accent: '#4285F4' },
  { name: 'Stripe', Icon: StripeIcon, tools: 2, accent: '#635BFF' },
  { name: 'Vercel', Icon: VercelIcon, tools: 2, accent: '#f0f0f0' },
  { name: 'Resend', Icon: ResendIcon, tools: 1, accent: '#f0f0f0' },
  { name: 'Neon', Icon: NeonIcon, tools: 4, accent: '#00E699' },
]

/* ─── Reusable Components ─── */

function FadeIn({
  children,
  delay = 0,
  className = '',
  y = 20,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  y?: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5, ease }}
      className={className || undefined}
      suppressHydrationWarning
    >
      {children}
    </motion.div>
  )
}

/* Staggered children reveal — each child fades in sequentially */
function StaggerIn({
  children,
  className = '',
  staggerDelay = 0.08,
}: {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{ visible: { transition: { staggerChildren: staggerDelay } } }}
      className={className || undefined}
    >
      {children}
    </motion.div>
  )
}

const staggerChild = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease } },
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand font-mono">
      <span className="w-6 h-px bg-brand/40" />
      <TextScramble text={children} className="" speed={25} />
      <span className="w-6 h-px bg-brand/40" />
    </span>
  )
}

/* Spotlight card — mouse-following glow */
function SpotlightCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const ticking = useRef(false)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (ticking.current) return
    ticking.current = true
    const cx = e.clientX,
      cy = e.clientY
    requestAnimationFrame(() => {
      const el = ref.current
      if (el) {
        const rect = el.getBoundingClientRect()
        el.style.setProperty('--mouse-x', `${cx - rect.left}px`)
        el.style.setProperty('--mouse-y', `${cy - rect.top}px`)
      }
      ticking.current = false
    })
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`spotlight-card glass-card rounded-2xl ${className}`}
    >
      {children}
    </div>
  )
}

/* 3D tilt card */
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 })
  const ticking = useRef(false)

  const handleMouse = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (ticking.current) return
      ticking.current = true
      const cx = e.clientX,
        cy = e.clientY
      requestAnimationFrame(() => {
        const el = ref.current
        if (el) {
          const rect = el.getBoundingClientRect()
          x.set((cx - rect.left) / rect.width - 0.5)
          y.set((cy - rect.top) / rect.height - 0.5)
        }
        ticking.current = false
      })
    },
    [x, y],
  )

  const handleLeave = useCallback(() => {
    x.set(0)
    y.set(0)
  }, [x, y])

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* Terminal with character-by-character typing */
function TypedTerminal() {
  const [lines, setLines] = useState<string[]>([])
  const [currentLine, setCurrentLine] = useState('')
  const [lineIdx, setLineIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [showCursor, setShowCursor] = useState(true)

  const LINES = [
    { text: '$ npx opentool-cli', speed: 35 },
    { text: '→ Loading tools...', speed: 20 },
    { text: '✓ github        5 tools', speed: 15 },
    { text: '✓ notion         3 tools', speed: 15 },
    { text: '✓ slack          2 tools', speed: 15 },
    { text: '✓ neon           4 tools', speed: 15 },
    { text: '✓ gmail          3 tools', speed: 15 },
    { text: '→ 26 tools loaded across 10 providers', speed: 15 },
    { text: '✓ MCP server running on :3001/mcp', speed: 20 },
  ]

  useEffect(() => {
    if (lineIdx >= LINES.length) return

    const line = LINES[lineIdx]
    if (charIdx < line.text.length) {
      const timer = setTimeout(() => {
        setCurrentLine(line.text.slice(0, charIdx + 1))
        setCharIdx(charIdx + 1)
      }, line.speed)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(
        () => {
          setLines((prev) => [...prev, line.text])
          setCurrentLine('')
          setCharIdx(0)
          setLineIdx(lineIdx + 1)
        },
        lineIdx === 0 ? 500 : 200,
      )
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIdx, charIdx])

  useEffect(() => {
    const timer = setInterval(() => setShowCursor((v) => !v), 530)
    return () => clearInterval(timer)
  }, [])

  const getColor = (text: string) => {
    if (text.startsWith('$')) return '#00d4ff'
    if (text.startsWith('✓') && text.includes('running')) return '#00d4ff'
    if (text.startsWith('✓')) return 'rgba(255,255,255,0.75)'
    if (text.startsWith('→')) return 'rgba(255,255,255,0.5)'
    return 'rgba(255,255,255,0.6)'
  }

  return (
    <div
      className="relative rounded-2xl border border-white/[0.12] overflow-hidden bg-[#080820]"
      style={{
        boxShadow:
          '0 50px 100px -25px rgba(0,0,0,0.8), 0 0 80px rgba(0,212,255,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Title bar */}
      <div className="h-11 bg-[#0d0d24] border-b border-white/[0.08] flex items-center justify-between px-4">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-110 transition" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:brightness-110 transition" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] hover:brightness-110 transition" />
        </div>
        <span className="text-[11px] text-white/25 font-mono tracking-wider">opentool — zsh</span>
        <div className="w-14" />
      </div>
      {/* Terminal body */}
      <div className="bg-[#080820] px-6 py-5 min-h-[220px]">
        {lines.map((line, i) => (
          <div key={i} className="font-mono text-xs leading-[2]" style={{ color: getColor(line) }}>
            {line}
          </div>
        ))}
        {lineIdx < LINES.length && (
          <div
            className="font-mono text-xs leading-[2]"
            style={{ color: getColor(currentLine || LINES[lineIdx]?.text || '') }}
          >
            {currentLine}
            <span
              className={`inline-block w-[7px] h-[15px] ml-[1px] -mb-[2px] bg-white/60 rounded-[1px] ${showCursor ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
        )}
        {lineIdx >= LINES.length && (
          <div className="font-mono text-xs leading-[2]">
            <span
              className={`inline-block w-[7px] h-[15px] bg-white/60 rounded-[1px] ${showCursor ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#080820] to-transparent pointer-events-none" />
    </div>
  )
}

/* Animated counter */
function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 1500
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      start = Math.round(eased * value)
      setCount(start)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, value])

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  )
}

/* Scroll progress bar */
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] scroll-progress origin-left"
      style={{ scaleX }}
    />
  )
}

/* ─────────────────── LANDING PAGE ─────────────────── */
export default function LandingPage() {
  const { apiKey } = useAuth()
  const [configTab, setConfigTab] = useState<'claude' | 'cursor' | 'cli'>('claude')
  const [sdkTab, setSdkTab] = useState<'typescript' | 'python' | 'curl'>('typescript')
  const [stars, setStars] = useState<number | null>(null)
  const { scrollYProgress: globalProgress } = useScroll()
  const heroOpacity = useTransform(globalProgress, [0, 0.15], [1, 0])
  const heroScale = useTransform(globalProgress, [0, 0.15], [1, 0.95])

  useEffect(() => {
    const cached = sessionStorage.getItem('gh-stars')
    if (cached) {
      setStars(Number(cached))
      return
    }
    fetch('https://api.github.com/repos/Aditya251610/opentool')
      .then((r) => r.json())
      .then((d) => {
        if (d.stargazers_count != null) {
          setStars(d.stargazers_count)
          sessionStorage.setItem('gh-stars', String(d.stargazers_count))
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen text-white overflow-x-hidden">
      <ScrollProgress />
      <ParallaxStars />
      <CursorNebula />
      <Navbar animate />

      {/* ═══════════════════ HERO — Cinematic Reveal ═══════════════════ */}
      <motion.section
        id="main-content"
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-[100vh] flex flex-col items-center justify-center text-center px-6 pt-[72px]"
      >
        {/* Background layers */}
        <div className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none opacity-30" />
        <FloatingLogos />

        {/* Content — cinematic staggered reveal */}
        <div className="relative z-10 max-w-[900px] mx-auto">
          {/* Announcement badge — appears first */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 1.0, duration: 0.5, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/[0.08] pl-1.5 pr-4 py-1 mb-10 shadow-[0_0_20px_rgba(0,212,255,0.15)]"
          >
            <span className="bg-brand text-black text-[10px] font-bold px-2.5 py-[3px] rounded-full leading-none">
              v0.1.1
            </span>
            <span className="text-xs text-white/60">CLI + TypeScript SDK now on npm</span>
          </motion.div>

          {/* Headline — CINEMATIC, word-by-word blur→sharp */}
          <motion.h1
            className="text-[48px] sm:text-[64px] md:text-[80px] lg:text-[96px] font-extrabold leading-[0.9] tracking-[-0.05em]"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 1.2 } } }}
          >
            {['One', 'MCP', 'server.'].map((w, i) => (
              <motion.span
                key={`a${i}`}
                className={`inline-block mr-[0.22em] text-white ${w === 'MCP' ? 'text-brand' : ''}`}
                data-text={undefined}
                variants={{
                  hidden: { opacity: 0, y: 30, filter: 'blur(12px)' },
                  visible: {
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                    transition: { duration: 0.7, ease: [0, 0, 0.2, 1] },
                  },
                }}
              >
                {w}
              </motion.span>
            ))}
            <br />
            {['All', 'your'].map((w, i) => (
              <motion.span
                key={`b${i}`}
                className="inline-block mr-[0.22em] text-white/50"
                variants={{
                  hidden: { opacity: 0, y: 30, filter: 'blur(12px)' },
                  visible: {
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                    transition: { duration: 0.7, ease: [0, 0, 0.2, 1] },
                  },
                }}
              >
                {w}
              </motion.span>
            ))}
            <motion.span
              className="inline-block text-gradient"
              variants={{
                hidden: { opacity: 0, y: 30, filter: 'blur(12px)' },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  transition: { duration: 0.7, ease: [0, 0, 0.2, 1] },
                },
              }}
            >
              tools.
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.0, duration: 0.6, ease }}
            className="text-base md:text-[19px] text-white/45 mt-8 max-w-[540px] mx-auto leading-[1.8]"
          >
            The open-source MCP server that gives AI agents secure, authenticated access to GitHub,
            Notion, Slack, and 7 more providers — 26 tools total. Self-hosted. MIT licensed.
          </motion.p>

          {/* CTAs — glow buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.3, duration: 0.6, ease }}
            className="flex flex-wrap items-center justify-center gap-4 mt-12"
          >
            <MagneticButton strength={0.15}>
              <Link
                href={apiKey ? '/dashboard' : '/signup'}
                className="group relative h-12 px-8 rounded-xl bg-brand text-black text-sm font-bold inline-flex items-center gap-2 hover:bg-brand-hover transition-all duration-300 shadow-[0_4px_50px_rgba(0,212,255,0.4)] hover:shadow-[0_8px_70px_rgba(0,212,255,0.55)] hover:-translate-y-[2px]"
              >
                {apiKey ? 'Open Dashboard' : 'Get Started Free'}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </MagneticButton>
            <MagneticButton strength={0.2}>
              <Link
                href="https://github.com/Aditya251610/opentool"
                target="_blank"
                className="h-12 px-8 rounded-xl border border-white/[0.12] text-white/70 text-sm font-medium inline-flex items-center gap-2.5 hover:border-white/[0.25] hover:bg-white/[0.04] hover:text-white transition-all duration-300"
              >
                <GitHubIcon size={17} /> View Source
              </Link>
            </MagneticButton>
          </motion.div>

          {/* Trust signals — last to appear */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.8, duration: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 mt-12 text-xs sm:text-xs text-white/25"
          >
            {stars !== null && (
              <>
                <Link
                  href="https://github.com/Aditya251610/opentool"
                  target="_blank"
                  className="flex items-center gap-1.5 text-white/40 hover:text-white/60 transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="text-brand/60"
                  >
                    <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
                  </svg>
                  {stars} stars
                </Link>
                <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-white/10" />
              </>
            )}
            {['MIT Licensed', 'Self-hosted', '26 tools'].map((t, i) => (
              <span key={t} className="flex items-center gap-2">
                {i > 0 && (
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-white/10" />
                )}
                {t}
              </span>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ═══════════════════ WORKS WITH — Marquee ═══════════════════ */}
      <section className="relative py-5 border-y border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand/[0.04] to-transparent pointer-events-none" />
        {/* Edge fades */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#030014] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#030014] to-transparent z-10 pointer-events-none" />
        <div className="flex items-center overflow-hidden">
          <div className="marquee-track flex items-center gap-6 shrink-0">
            {[
              ...['Claude Code', 'Cursor', 'Windsurf', 'VS Code', 'Codex', 'Any MCP Client'],
              ...['Claude Code', 'Cursor', 'Windsurf', 'VS Code', 'Codex', 'Any MCP Client'],
            ].map((a, i) => (
              <span
                key={`${a}-${i}`}
                className="text-xs text-white/40 px-4 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] whitespace-nowrap shrink-0"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ THE PROBLEM ═══════════════════ */}
      <section className="py-28 md:py-44 px-6 relative section-lazy section-danger">
        <span className="section-number" aria-hidden="true">
          01
        </span>
        <div className="max-w-[900px] mx-auto relative">
          <FadeIn className="mb-16 md:mb-24">
            <SectionLabel>THE PROBLEM</SectionLabel>
            <h2 className="text-[36px] sm:text-[48px] md:text-[64px] font-extrabold text-white leading-[1.02] tracking-[-0.04em] mt-4">
              Building agents is easy.
              <br />
              <span className="text-white/40">Connecting them is not.</span>
            </h2>
          </FadeIn>

          {/* Problem rows — numbered list, each row is a horizontal band */}
          <div className="space-y-6">
            <FadeIn>
              <div className="group flex items-start gap-6 md:gap-10 p-6 md:p-8 rounded-2xl border border-red-500/10 bg-red-500/[0.02] hover:bg-red-500/[0.04] hover:border-red-500/20 transition-all duration-300">
                <span className="shrink-0 text-[48px] md:text-[64px] font-black text-red-500/20 leading-none font-mono select-none group-hover:text-red-500/30 transition-colors">
                  01
                </span>
                <div className="pt-1">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">OAuth hell</h3>
                  <p className="text-sm text-white/50 leading-[1.75] mb-5">
                    You end up writing more auth code than agent code. Every provider has different
                    flows, token formats, and refresh logic.
                  </p>
                  <div className="rounded-lg bg-black/60 border border-white/[0.06] p-4 font-mono text-xs leading-[2] text-white/30 overflow-x-auto">
                    <div>
                      <span className="text-white/15">
                        {"// This is what you're writing today"}
                      </span>
                    </div>
                    <div>
                      <span className="text-red-400/80">const</span> token ={' '}
                      <span className="text-red-400/80">await</span> refreshOAuthToken(
                    </div>
                    <div className="pl-4">provider, clientId, clientSecret, refreshToken</div>
                    <div>)</div>
                    <div>
                      <span className="text-white/15">
                        {'// × 10 providers × token rotation = pain'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="group flex items-start gap-6 md:gap-10 p-6 md:p-8 rounded-2xl border border-amber-500/10 bg-amber-500/[0.02] hover:bg-amber-500/[0.04] hover:border-amber-500/20 transition-all duration-300">
                <span className="shrink-0 text-[48px] md:text-[64px] font-black text-amber-500/20 leading-none font-mono select-none group-hover:text-amber-500/30 transition-colors">
                  02
                </span>
                <div className="pt-1">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">Token sprawl</h3>
                  <p className="text-sm text-white/50 leading-[1.75]">
                    Tokens scattered across .env files, secret managers, local configs. One expired
                    token at 2am breaks your entire pipeline. No central view of what&apos;s valid,
                    what&apos;s expiring, what&apos;s revoked.
                  </p>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="group flex items-start gap-6 md:gap-10 p-6 md:p-8 rounded-2xl border border-violet-500/10 bg-violet-500/[0.02] hover:bg-violet-500/[0.04] hover:border-violet-500/20 transition-all duration-300">
                <span className="shrink-0 text-[48px] md:text-[64px] font-black text-violet-500/20 leading-none font-mono select-none group-hover:text-violet-500/30 transition-colors">
                  03
                </span>
                <div className="pt-1">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">Vendor lock-in</h3>
                  <p className="text-sm text-white/50 leading-[1.75]">
                    Hosted platforms own your tokens and charge per seat. You can&apos;t audit the
                    code, customize behavior, or self-host. Your agent infrastructure depends on
                    someone else&apos;s uptime.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════════ ARCHITECTURE ═══════════════════ */}
      <section className="py-28 md:py-48 px-6 section-divider relative overflow-hidden section-lazy section-nebula">
        <span className="section-number" aria-hidden="true">
          02
        </span>
        <div className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none opacity-25" />
        <div className="max-w-[1100px] mx-auto relative z-10">
          <FadeIn className="text-center mb-14 md:mb-28">
            <SectionLabel>THE SOLUTION</SectionLabel>
            <h2 className="text-[36px] sm:text-[48px] md:text-[64px] font-extrabold text-white mt-4 leading-[1.02] tracking-[-0.04em]">
              One connection. <span className="text-gradient">Every tool.</span>
            </h2>
            <p className="text-base text-white/45 mt-5 max-w-[480px] mx-auto leading-[1.8]">
              Your agent connects once to OpenTool. We handle auth, tokens, and API calls for all
              your tools.
            </p>
          </FadeIn>

          {/* Architecture diagram — enhanced */}
          <FadeIn className="max-w-[900px] mx-auto">
            <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 sm:p-8 md:p-12 overflow-hidden">
              {/* Subtle grid bg inside the card */}
              <div className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none opacity-10" />

              {/* Desktop: row-based layout — each row perfectly aligned */}
              <div className="relative hidden md:block z-10">
                {/* Hub — absolutely centered */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <motion.div
                    className="relative pointer-events-auto"
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, duration: 0.6, ease }}
                  >
                    {[0, 1, 2].map((r) => (
                      <motion.div
                        key={r}
                        className="absolute inset-0 rounded-full border border-brand/20"
                        style={{ margin: `-${(r + 1) * 12}px` }}
                        animate={{
                          scale: [1, 1.15, 1],
                          opacity: [0.3 - r * 0.08, 0.08, 0.3 - r * 0.08],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: r * 0.6,
                        }}
                      />
                    ))}
                    <div className="relative w-[120px] h-[120px] rounded-full border-2 border-brand/40 bg-black flex flex-col items-center justify-center gap-2 shadow-[0_0_40px_rgba(0,212,255,0.15)]">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#00d4ff"
                        strokeWidth="1.5"
                      >
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="5" cy="19" r="2" />
                        <circle cx="19" cy="19" r="2" />
                        <path d="M12 7v4m0 0l-5.5 6M12 11l5.5 6" />
                      </svg>
                      <span className="text-[9px] font-mono text-brand tracking-[0.15em] uppercase">
                        OpenTool
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* Rows */}
                <div className="flex flex-col gap-4">
                  {[
                    {
                      agent: 'Claude Code',
                      agentBorder: 'border-white/[0.1]',
                      toolIcon: GitHubIcon,
                      tool: 'GitHub',
                    },
                    {
                      agent: 'Cursor',
                      agentBorder: 'border-brand/25',
                      toolIcon: SlackIcon,
                      tool: 'Slack',
                    },
                    {
                      agent: 'Your Agent',
                      agentBorder: 'border-white/[0.06] border-dashed',
                      toolIcon: NotionIcon,
                      tool: '+8 more',
                    },
                  ].map((row, i) => {
                    const ToolIcon = row.toolIcon
                    return (
                      <div key={row.agent} className="flex items-center gap-0">
                        {/* Agent box */}
                        <motion.div
                          initial={{ opacity: 0, x: -30 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1, duration: 0.5, ease }}
                          className={`shrink-0 px-6 py-3.5 rounded-xl ${row.agentBorder} border bg-surface-card/80 backdrop-blur-sm text-xs font-mono text-white/60 text-center whitespace-nowrap hover:bg-white/[0.04] transition-all duration-200`}
                        >
                          {row.agent}
                        </motion.div>

                        {/* Left arrow — grows to fill space */}
                        <div className="flex-1 flex items-center justify-center px-1">
                          <svg
                            width="100%"
                            height="20"
                            viewBox="0 0 100 20"
                            preserveAspectRatio="none"
                            className="overflow-visible"
                          >
                            <motion.line
                              x1="0"
                              y1="10"
                              x2="82"
                              y2="10"
                              stroke="rgba(0,212,255,0.25)"
                              strokeWidth="1"
                              strokeDasharray="6 4"
                              initial={{ strokeDashoffset: 20 }}
                              animate={{ strokeDashoffset: 0 }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            />
                            <motion.path
                              d="M80 4 L92 10 L80 16"
                              fill="none"
                              stroke="#00d4ff"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ opacity: 0.4 }}
                              animate={{ opacity: [0.4, 0.9, 0.4] }}
                              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                            />
                          </svg>
                        </div>

                        {/* Hub spacer */}
                        <div className="shrink-0 w-[120px]" />

                        {/* Right arrow — grows to fill space */}
                        <div className="flex-1 flex items-center justify-center px-1">
                          <svg
                            width="100%"
                            height="20"
                            viewBox="0 0 100 20"
                            preserveAspectRatio="none"
                            className="overflow-visible"
                          >
                            <motion.line
                              x1="8"
                              y1="10"
                              x2="90"
                              y2="10"
                              stroke="rgba(0,212,255,0.25)"
                              strokeWidth="1"
                              strokeDasharray="6 4"
                              initial={{ strokeDashoffset: 20 }}
                              animate={{ strokeDashoffset: 0 }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            />
                            <motion.path
                              d="M88 4 L100 10 L88 16"
                              fill="none"
                              stroke="#00d4ff"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ opacity: 0.4 }}
                              animate={{ opacity: [0.4, 0.9, 0.4] }}
                              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 + 0.5 }}
                            />
                          </svg>
                        </div>

                        {/* Tool box */}
                        <motion.div
                          initial={{ opacity: 0, x: 30 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.7 + i * 0.1, duration: 0.5, ease }}
                          className="shrink-0 flex items-center gap-3 px-6 py-3.5 rounded-xl border border-white/[0.08] bg-surface-card/80 backdrop-blur-sm hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-200"
                        >
                          <ToolIcon size={18} className="text-white/50" />
                          <span className="text-xs font-mono text-white/60">{row.tool}</span>
                        </motion.div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Mobile: vertical stacked layout */}
              <div className="relative flex md:hidden flex-col items-center gap-5">
                {/* Agents */}
                <div className="flex flex-wrap justify-center gap-3 z-10">
                  {['Claude Code', 'Cursor', 'Your Agent'].map((a) => (
                    <div
                      key={a}
                      className="px-4 py-2.5 rounded-xl border border-white/[0.08] bg-surface-card/80 text-xs font-mono text-white/60"
                    >
                      {a}
                    </div>
                  ))}
                </div>

                {/* Down arrow */}
                <svg width="28" height="40" viewBox="0 0 28 40" className="text-brand/40">
                  <line
                    x1="14"
                    y1="0"
                    x2="14"
                    y2="30"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                  />
                  <path
                    d="M8 28 L14 36 L20 28"
                    fill="none"
                    stroke="#00d4ff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* OpenTool hub */}
                <div className="relative z-10">
                  {[0, 1].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border border-brand/20"
                      style={{ margin: `-${(i + 1) * 10}px` }}
                      animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.25 - i * 0.08, 0.06, 0.25 - i * 0.08],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.6,
                      }}
                    />
                  ))}
                  <div className="w-[100px] h-[100px] rounded-full border-2 border-brand/40 bg-black flex flex-col items-center justify-center gap-1.5">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#00d4ff"
                      strokeWidth="1.5"
                    >
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="5" cy="19" r="2" />
                      <circle cx="19" cy="19" r="2" />
                      <path d="M12 7v4m0 0l-5.5 6M12 11l5.5 6" />
                    </svg>
                    <span className="text-[8px] font-mono text-brand tracking-[0.15em] uppercase">
                      OpenTool
                    </span>
                  </div>
                </div>

                {/* Down arrow */}
                <svg width="28" height="40" viewBox="0 0 28 40" className="text-brand/40">
                  <line
                    x1="14"
                    y1="0"
                    x2="14"
                    y2="30"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                  />
                  <path
                    d="M8 28 L14 36 L20 28"
                    fill="none"
                    stroke="#00d4ff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Tools */}
                <div className="flex flex-wrap justify-center gap-3 z-10">
                  {[
                    { Icon: GitHubIcon, name: 'GitHub' },
                    { Icon: SlackIcon, name: 'Slack' },
                    { Icon: NotionIcon, name: '+8 more' },
                  ].map((t) => (
                    <div
                      key={t.name}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-surface-card/80"
                    >
                      <t.Icon size={16} className="text-white/50" />
                      <span className="text-xs font-mono text-white/60">{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Callouts */}
          <FadeIn
            delay={0.2}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mt-16"
          >
            {[
              'Tokens never leave your server',
              '100% open source, MIT licensed',
              'Self-host in one command',
              'Works with any MCP client',
            ].map((t) => (
              <span key={t} className="flex items-center gap-2.5 text-sm text-white/55">
                <span className="w-5 h-5 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="#00d4ff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {t}
              </span>
            ))}
          </FadeIn>
        </div>
      </section>

      <section className="py-28 md:py-44 px-6 section-divider section-lazy relative">
        <span className="section-number" aria-hidden="true">
          03
        </span>
        <div className="max-w-[1100px] mx-auto">
          <div className="grid md:grid-cols-[1fr,1.2fr] gap-10 md:gap-16 items-start">
            {/* Left — copy */}
            <FadeIn>
              <h2 className="text-[32px] sm:text-[40px] md:text-[52px] font-extrabold text-white leading-[1.1] tracking-[-0.03em]">
                Three lines to any tool.
              </h2>
              <p className="text-base text-white/50 mt-5 leading-[1.8]">
                TypeScript SDK, Python SDK, or raw HTTP. Pick your language, install the package,
                call any tool. Auth is handled for you — your agent never touches a token.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                {[
                  { label: 'Type-safe', icon: '⬡' },
                  { label: 'Async-first', icon: '⚡' },
                  { label: 'Zero config', icon: '○' },
                ].map((t) => (
                  <span
                    key={t.label}
                    className="flex items-center gap-2 text-xs text-white/30 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.015]"
                  >
                    <span className="text-brand text-[11px]">{t.icon}</span>
                    {t.label}
                  </span>
                ))}
              </div>
              <div className="mt-8">
                <Link
                  href="/docs#sdk"
                  className="text-brand text-sm font-medium hover:underline inline-flex items-center gap-1.5"
                >
                  SDK Documentation
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 3l5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </div>
            </FadeIn>

            {/* Right — code tabs */}
            <FadeIn delay={0.15}>
              <div className="rounded-2xl border border-white/[0.08] bg-[#080820] overflow-hidden">
                {/* Tab bar */}
                <div className="flex items-center gap-0 border-b border-white/[0.06] bg-[#0F0F0F]">
                  {(['typescript', 'python', 'curl'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSdkTab(tab)}
                      className={`px-5 py-3 text-xs font-mono transition-all cursor-pointer border-b-2 ${
                        sdkTab === tab
                          ? 'text-brand border-brand bg-brand/[0.04]'
                          : 'text-white/30 border-transparent hover:text-white/50 hover:bg-white/[0.02]'
                      }`}
                    >
                      {tab === 'typescript' ? 'TypeScript' : tab === 'python' ? 'Python' : 'cURL'}
                    </button>
                  ))}
                </div>
                {/* Code */}
                <div className="p-6 font-mono text-[12.5px] leading-[2] overflow-x-auto min-h-[280px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={sdkTab}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      {sdkTab === 'typescript' && (
                        <pre className="text-white/45">
                          {`import { `}
                          <span className="text-brand">OpenTool</span>
                          {` } from '@opentool/sdk'

const ot = new `}
                          <span className="text-brand">OpenTool</span>
                          {`({ apiKey: process.env.`}
                          <span className="text-[#22c55e]">OPENTOOL_KEY</span>
                          {` })

`}
                          <span className="text-white/15">{`// Execute any tool — auth handled automatically`}</span>
                          {`
const issue = await ot.tools.`}
                          <span className="text-brand">execute</span>
                          {`(
  `}
                          <span className="text-[#22c55e]">{`'github.create_issue'`}</span>
                          {`,
  { userId: `}
                          <span className="text-[#22c55e]">{`'user_123'`}</span>
                          {`, input: { title: `}
                          <span className="text-[#22c55e]">{`'Ship v2'`}</span>
                          {` } }
)

`}
                          <span className="text-white/15">{`// List all available tools`}</span>
                          {`
const tools = await ot.tools.`}
                          <span className="text-brand">list</span>
                          {`()
console.log(\`\${tools.length} tools ready\`)`}
                        </pre>
                      )}
                      {sdkTab === 'python' && (
                        <pre className="text-white/45">
                          {`from `}
                          <span className="text-brand">opentool</span>
                          {` import OpenTool

ot = OpenTool(api_key=os.environ[`}
                          <span className="text-[#22c55e]">{`"OPENTOOL_KEY"`}</span>
                          {`])

`}
                          <span className="text-white/15">{`# Execute any tool — auth handled automatically`}</span>
                          {`
issue = `}
                          <span className="text-brand">await</span>
                          {` ot.tools.execute(
    `}
                          <span className="text-[#22c55e]">{`"github.create_issue"`}</span>
                          {`,
    user_id=`}
                          <span className="text-[#22c55e]">{`"user_123"`}</span>
                          {`,
    input={`}
                          <span className="text-[#22c55e]">{`"title"`}</span>
                          {`: `}
                          <span className="text-[#22c55e]">{`"Ship v2"`}</span>
                          {`}
)

`}
                          <span className="text-white/15">{`# List all available tools`}</span>
                          {`
tools = `}
                          <span className="text-brand">await</span>
                          {` ot.tools.list()
print(f"{len(tools)} tools ready")`}
                        </pre>
                      )}
                      {sdkTab === 'curl' && (
                        <pre className="text-white/45">
                          {``}
                          <span className="text-white/15">{`# Execute a tool`}</span>
                          {`
curl -X POST http://localhost:3001/api/tools/execute \\
  -H `}
                          <span className="text-[#22c55e]">{`"Authorization: Bearer $OPENTOOL_KEY"`}</span>
                          {` \\
  -H `}
                          <span className="text-[#22c55e]">{`"Content-Type: application/json"`}</span>
                          {` \\
  -d '{
    "toolId": `}
                          <span className="text-[#22c55e]">{`"github.create_issue"`}</span>
                          {`,
    "userId": `}
                          <span className="text-[#22c55e]">{`"user_123"`}</span>
                          {`,
    "input": { "title": `}
                          <span className="text-[#22c55e]">{`"Ship v2"`}</span>
                          {` }
  }'

`}
                          <span className="text-white/15">{`# List available tools`}</span>
                          {`
curl http://localhost:3001/api/tools \\
  -H `}
                          <span className="text-[#22c55e]">{`"Authorization: Bearer $OPENTOOL_KEY"`}</span>
                        </pre>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════════ TERMINAL DEMO — Standalone ═══════════════════ */}
      <section className="py-20 md:py-32 px-6 section-divider section-lazy">
        <div className="max-w-[780px] mx-auto">
          <FadeIn className="text-center mb-10">
            <SectionLabel>SEE IT IN ACTION</SectionLabel>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-extrabold text-white mt-4 leading-[1.1] tracking-[-0.03em]">
              From zero to tools in <span className="text-gradient">60 seconds</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="relative">
              <div className="nebula-card animated-border p-1">
                <TypedTerminal />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ FEATURES (Bento Grid) ═══════════════════ */}
      <section
        id="features"
        className="py-28 md:py-48 px-6 section-divider section-lazy section-cosmos relative"
      >
        <span className="section-number" aria-hidden="true">
          04
        </span>
        <div className="max-w-[1100px] mx-auto">
          <FadeIn className="mb-14 md:mb-28">
            <SectionLabel>FEATURES</SectionLabel>
            <h2 className="text-[36px] sm:text-[48px] md:text-[64px] font-extrabold text-white leading-[1.05] tracking-[-0.04em] mt-4">
              Built for agents. Not wrappers.
            </h2>
            <p className="text-base text-white/45 mt-5 max-w-[460px] leading-[1.8]">
              Not a demo. Not a prototype. The execution layer your agent deserves.
            </p>
          </FadeIn>

          {/* Bento grid — asymmetric: [2+1] top, [1+2] bottom */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Auth Broker — 2 columns, nebula card */}
            <FadeIn className="md:col-span-2">
              <div className="nebula-card h-full p-8 md:p-10 relative">
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <div>
                    <div className="w-11 h-11 rounded-xl bg-brand/10 border border-brand/25 flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.25),0_0_60px_rgba(0,212,255,0.08)]">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#00d4ff"
                        strokeWidth="2"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </div>
                    <h3 className="text-[22px] font-bold text-white mt-5">OAuth Auth Broker</h3>
                    <p className="text-sm text-white/50 mt-3 leading-[1.75]">
                      Every OAuth flow handled automatically. Tokens stored encrypted with
                      AES-256-GCM, refreshed before expiry. Your agent never touches a token.
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/60 border border-white/[0.05] p-5 font-mono text-xs leading-[2] text-white/40 overflow-x-auto">
                    <div>
                      <span className="text-white/15">{'// Agent never sees the token'}</span>
                    </div>
                    <div>
                      <span className="text-brand">const</span> result ={' '}
                      <span className="text-brand">await</span> executeTool({'{'}
                    </div>
                    <div className="pl-4">
                      toolId:{' '}
                      <span className="text-[#22c55e]">&apos;github.create_issue&apos;</span>,
                    </div>
                    <div className="pl-4">
                      userId: <span className="text-[#22c55e]">&apos;user_abc&apos;</span>,
                    </div>
                    <div className="pl-4">
                      input: {'{'} title:{' '}
                      <span className="text-[#22c55e]">&apos;Fix auth bug&apos;</span> {'}'}
                    </div>
                    <div>{'}'})</div>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Tool Registry — violet stripe */}
            <FadeIn delay={0.1}>
              <SpotlightCard className="h-full p-7 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-violet/60 via-accent-violet/30 to-transparent" />
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
                <h3 className="text-base font-bold text-white mt-5">Tool Registry</h3>
                <p className="text-xs text-white/50 mt-2.5 leading-[1.7]">
                  Every tool defined once in TypeScript with Zod schemas. Auto-synced to DB.
                  Available via MCP instantly.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-6">
                  {['github', 'notion', 'slack', 'linear', 'gmail', 'gcal', '+4'].map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-white/40"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </SpotlightCard>
            </FadeIn>

            {/* One API Key — cyan stripe + tint */}
            <FadeIn delay={0.15}>
              <SpotlightCard className="h-full p-7 bg-brand/[0.03] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand/70 via-brand/30 to-transparent" />
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00d4ff"
                  strokeWidth="1.5"
                >
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                <h3 className="text-base font-bold text-white mt-5">One API Key</h3>
                <p className="text-xs text-white/50 mt-2.5 leading-[1.7]">
                  Point any agent at your MCP server with a single key. We resolve connected tools
                  at runtime.
                </p>
                <div className="mt-6 flex items-center px-3.5 py-2.5 rounded-lg bg-black/60 border border-brand/10">
                  <span className="text-xs font-mono text-[#22c55e] truncate">
                    OPENTOOL_API_KEY=ot_ab12cd34ef...
                  </span>
                </div>
              </SpotlightCard>
            </FadeIn>

            {/* Audit Trail + Open Source — 2-col span (mirrors top) */}
            <FadeIn delay={0.2} className="md:col-span-2">
              <div className="grid md:grid-cols-2 gap-4 h-full">
                {/* Audit Trail — green stripe */}
                <SpotlightCard className="p-7 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#22c55e]/60 via-[#22c55e]/20 to-transparent" />
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth="1.5"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6" />
                    <line x1="8" y1="13" x2="16" y2="13" />
                    <line x1="8" y1="17" x2="16" y2="17" />
                  </svg>
                  <h3 className="text-base font-bold text-white mt-5">Full Audit Trail</h3>
                  <p className="text-xs text-white/50 mt-2.5 leading-[1.7]">
                    Every tool execution logged — user, tool, input, output, duration, status.
                  </p>
                  <div className="mt-5 rounded-lg border border-white/[0.05] overflow-hidden divide-y divide-white/[0.04]">
                    {[
                      { tool: 'github.create_issue', ok: true, ms: '234ms' },
                      { tool: 'slack.send_message', ok: true, ms: '89ms' },
                      { tool: 'notion.query_db', ok: false, ms: '1.2s' },
                    ].map((l) => (
                      <div key={l.tool} className="flex items-center gap-2 px-3 py-2 bg-black/40">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${l.ok ? 'bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'bg-[#ef4444] shadow-[0_0_6px_rgba(239,68,68,0.4)]'}`}
                        />
                        <span className="text-[11px] font-mono text-white/50 flex-1 truncate">
                          {l.tool}
                        </span>
                        <span className="text-[10px] font-mono text-white/20">{l.ms}</span>
                      </div>
                    ))}
                  </div>
                </SpotlightCard>

                {/* Open Source — white stripe */}
                <SpotlightCard className="p-7 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-white/40 via-white/15 to-transparent" />
                  <GitHubIcon size={22} className="text-white/45" />
                  <h3 className="text-base font-bold text-white mt-5">100% Open Source</h3>
                  <p className="text-xs text-white/50 mt-2.5 leading-[1.7]">
                    MIT licensed. Fork it, modify it, self-host it. No black boxes. Your tokens
                    never touch anyone else&apos;s infrastructure.
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-[11px] text-[#22c55e] font-medium">
                      MIT License
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/40 font-medium">
                      Self-hosted
                    </span>
                  </div>
                </SpotlightCard>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════════ SETUP ═══════════════════ */}
      <section className="py-20 md:py-36 px-6 section-divider relative overflow-hidden section-lazy">
        <div className="absolute inset-0 hero-glow pointer-events-none opacity-30" />
        <div className="max-w-[720px] mx-auto relative z-10">
          <FadeIn className="mb-8">
            <h2 className="text-2xl sm:text-[32px] md:text-[40px] font-bold text-white leading-[1.1] tracking-[-0.02em]">
              Point your agent at OpenTool
            </h2>
            <p className="text-sm text-white/35 mt-3 max-w-[420px] leading-relaxed">
              Add one config block. That&apos;s the entire setup.
            </p>
          </FadeIn>

          {/* Config tabs */}
          <FadeIn delay={0.1}>
            <div className="flex gap-1.5 mb-4">
              {(['claude', 'cursor', 'cli'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setConfigTab(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    configTab === tab
                      ? 'bg-brand/10 text-brand border border-brand/25 shadow-[0_0_10px_rgba(0,212,255,0.1)]'
                      : 'text-white/30 hover:text-white/60 border border-transparent hover:border-white/[0.06]'
                  }`}
                >
                  {tab === 'claude'
                    ? 'Claude Desktop'
                    : tab === 'cursor'
                      ? 'Cursor'
                      : 'Claude Code'}
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-surface-subtle border border-white/[0.06] p-6 font-mono text-xs text-white/45 leading-relaxed overflow-x-auto">
              <AnimatePresence mode="wait">
                <motion.pre
                  key={configTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  {configTab === 'claude' &&
                    `{
  "mcpServers": {
    "opentool": {
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer ot_your_api_key"
      }
    }
  }
}`}
                  {configTab === 'cursor' &&
                    `// .cursor/mcp.json
{
  "mcpServers": {
    "opentool": {
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer ot_your_api_key"
      }
    }
  }
}`}
                  {configTab === 'cli' &&
                    `# Install the CLI
npx opentool-cli

# Or add to Claude Code
claude mcp add opentool \\
  --url http://localhost:3001/mcp`}
                </motion.pre>
              </AnimatePresence>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ INTEGRATIONS — Icon Grid ═══════════════════ */}
      <section
        id="tools"
        className="py-28 md:py-48 px-6 section-divider section-lazy section-nebula"
      >
        <div className="max-w-[1100px] mx-auto">
          <FadeIn className="text-center mb-14 md:mb-28">
            <h2 className="text-[36px] sm:text-[48px] md:text-[64px] font-extrabold text-white leading-[1.02] tracking-[-0.04em]">
              <Counter value={10} /> providers. <Counter value={26} /> tools.
            </h2>
            <p className="text-base text-white/45 mt-5 max-w-[420px] mx-auto leading-[1.8]">
              Each tool is a single TypeScript file. Add your own, open a PR.
            </p>
          </FadeIn>

          {/* Icon grid — 5x2 visual grid */}
          <StaggerIn
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-10"
            staggerDelay={0.05}
          >
            {TOOLS.map((tool) => (
              <motion.div key={tool.name} variants={staggerChild}>
                <div className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.15] transition-all duration-300 aspect-square">
                  {/* Brand color glow on hover */}
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 40%, ${tool.accent}18, transparent 70%)`,
                    }}
                  />
                  <tool.Icon
                    size={32}
                    className="text-white/50 group-hover:text-white/90 transition-colors duration-300 relative z-10"
                  />
                  <span className="text-xs font-medium text-white/50 group-hover:text-white/80 transition-colors relative z-10">
                    {tool.name}
                  </span>
                  <span className="text-[10px] font-mono text-white/20 relative z-10">
                    {tool.tools} tools
                  </span>
                </div>
              </motion.div>
            ))}
          </StaggerIn>

          {/* Contribute */}
          <FadeIn delay={0.3} className="mt-6">
            <Link
              href="/docs#adding-tools"
              className="group flex items-center justify-center gap-3 px-6 py-4 rounded-xl border border-dashed border-white/[0.08] hover:border-brand/25 hover:bg-brand/[0.015] transition-all duration-300"
            >
              <span className="w-8 h-8 rounded-lg bg-brand/[0.08] border border-brand/15 flex items-center justify-center text-brand text-lg font-light group-hover:bg-brand/10 transition-colors">
                +
              </span>
              <span className="text-sm text-white/60 font-medium group-hover:text-white/80 transition-colors">
                Add your own tool
              </span>
              <span className="text-xs text-white/25">— it&apos;s a single file</span>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* OPEN SOURCE section removed — redundant with hero trust signals, features bento, and comparison table */}

      <section className="py-28 md:py-40 px-6 section-divider section-lazy relative">
        <span className="section-number" aria-hidden="true">
          05
        </span>
        <div className="max-w-[800px] mx-auto">
          <FadeIn className="text-center mb-12 md:mb-20">
            <SectionLabel>COMPARISON</SectionLabel>
            <h2 className="text-[32px] sm:text-[40px] md:text-[52px] font-bold text-white leading-[1.1] tracking-[-0.03em] mt-4">
              Your infra. Your tokens. Your rules.
            </h2>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-3 bg-white/[0.02] border-b border-white/[0.06]">
                <div className="px-6 py-4 text-xs text-white/25 font-medium uppercase tracking-[0.08em]" />
                <div className="px-6 py-4 text-xs text-brand font-semibold uppercase tracking-[0.08em] text-center border-x border-white/[0.04]">
                  OpenTool
                </div>
                <div className="px-6 py-4 text-xs text-white/30 font-medium uppercase tracking-[0.08em] text-center">
                  Hosted Platforms
                </div>
              </div>
              {/* Rows */}
              {[
                { feature: 'Source code', ot: 'MIT — read, fork, audit', them: 'Closed source' },
                {
                  feature: 'Token custody',
                  ot: 'Encrypted on your servers',
                  them: 'Stored by vendor',
                },
                { feature: 'Hosting', ot: 'Your infrastructure', them: 'Vendor cloud' },
                { feature: 'Cost', ot: 'Free to self-host', them: 'Free tier → usage-based' },
                {
                  feature: 'Customization',
                  ot: 'Fork & modify source',
                  them: 'Build on their SDK',
                },
                {
                  feature: 'Audit trail',
                  ot: 'Built-in, full access',
                  them: 'Enterprise plans only',
                },
                {
                  feature: 'Vendor dependency',
                  ot: 'None — MIT, fully yours',
                  them: 'Core platform required',
                },
              ].map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-3 ${i % 2 === 0 ? '' : 'bg-white/[0.01]'} ${i < 6 ? 'border-b border-white/[0.04]' : ''}`}
                >
                  <div className="px-6 py-4 text-xs text-white/50 font-medium">{row.feature}</div>
                  <div className="px-6 py-4 text-xs text-white/70 text-center border-x border-white/[0.04] font-medium">
                    {row.ot}
                  </div>
                  <div className="px-6 py-4 text-xs text-white/30 text-center">{row.them}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.2} className="text-center mt-8">
            <p className="text-xs text-white/20">
              We&apos;re not against hosted platforms — they solve real problems. OpenTool is for
              developers who want full control.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ FAQ (SEO + AI Search) ═══════════════════ */}
      <section className="py-24 md:py-40 px-6 section-divider">
        <div className="max-w-[700px] mx-auto">
          <div className="text-center mb-12 md:mb-24">
            <h2 className="text-[32px] sm:text-[40px] md:text-[52px] font-bold text-white leading-[1.1] tracking-[-0.03em]">
              Frequently asked.
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'What is OpenTool?',
                a: 'OpenTool is an open-source, self-hosted MCP (Model Context Protocol) server that gives AI agents like Claude, GPT, and Cursor secure, authenticated access to tools like GitHub, Notion, Slack, and more. Think of it as the open-source alternative to Arcade.dev.',
              },
              {
                q: 'What is an MCP server?',
                a: 'MCP (Model Context Protocol) is a standard by Anthropic that lets AI agents call external tools securely. An MCP server acts as the bridge — it handles authentication, tool execution, and security so your agent can create GitHub issues, send Slack messages, or query databases.',
              },
              {
                q: 'How is OpenTool different from Arcade.dev?',
                a: 'OpenTool is fully open-source (MIT licensed), self-hosted (runs on your infrastructure), and free to run. Your OAuth tokens and API keys never leave your server. Arcade.dev is proprietary and cloud-hosted, with free and paid tiers — the key difference is infrastructure ownership.',
              },
              {
                q: 'Which AI agents work with OpenTool?',
                a: 'Any agent that supports MCP — Claude Desktop, Cursor, Windsurf, Claude Code, and any custom agent using the MCP SDK. OpenTool exposes a standard MCP endpoint that works with all compliant clients.',
              },
              {
                q: 'How do I deploy OpenTool?',
                a: 'One command: docker compose up -d. OpenTool ships as a Docker image with PostgreSQL included. No external dependencies, no cloud accounts needed.',
              },
              {
                q: 'Is my data secure?',
                a: 'Yes. OpenTool runs entirely on your infrastructure. OAuth tokens are encrypted with AES-256-GCM before storage. API keys are hashed with bcrypt. Every tool call is logged in an audit trail. Your tokens never leave your server.',
              },
            ].map((faq, i) => (
              <div key={i}>
                <details className="group rounded-xl border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                    {faq.q}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0 ml-4 text-white/20 group-open:rotate-45 transition-transform duration-200"
                    >
                      <path
                        d="M8 3v10M3 8h10"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </summary>
                  <div className="px-6 pb-5 text-sm text-white/50 leading-relaxed">{faq.a}</div>
                </details>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section className="relative py-32 md:py-52 px-6 section-divider overflow-hidden section-glow-cta section-lazy">
        <div className="absolute inset-0 cta-glow pointer-events-none" />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.06), transparent 55%)' }}
        />
        <div className="max-w-[700px] mx-auto text-center relative z-10">
          <FadeIn>
            <h2 className="text-[40px] sm:text-[56px] md:text-[76px] font-extrabold text-white leading-[0.95] tracking-[-0.045em]">
              Give your agent
              <br />
              <span className="text-gradient">the tools it needs.</span>
            </h2>
            <p className="text-lg text-white/45 mt-8 leading-[1.8]">
              Open source. Self-hostable. Free forever.
            </p>
          </FadeIn>

          <FadeIn delay={0.15} className="flex flex-wrap items-center justify-center gap-4 mt-16">
            <MagneticButton strength={0.15}>
              <Link
                href={apiKey ? '/dashboard' : '/signup'}
                className="group h-12 px-8 rounded-xl bg-brand text-black text-sm font-bold inline-flex items-center gap-2 hover:bg-brand-hover transition-all duration-300 shadow-[0_4px_50px_rgba(0,212,255,0.4)] hover:shadow-[0_8px_70px_rgba(0,212,255,0.55)] hover:-translate-y-[2px]"
              >
                {apiKey ? 'Open Dashboard' : 'Get Started Free'}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </MagneticButton>
            <MagneticButton strength={0.2}>
              <Link
                href="https://github.com/Aditya251610/opentool"
                target="_blank"
                className="h-12 px-8 rounded-xl border border-white/[0.1] text-white/60 text-sm font-medium inline-flex items-center gap-2.5 hover:border-white/[0.2] hover:bg-white/[0.03] hover:text-white transition-all duration-300"
              >
                <GitHubIcon size={18} /> View on GitHub
              </Link>
            </MagneticButton>
          </FadeIn>

          <FadeIn delay={0.25}>
            <p className="text-xs text-white/20 mt-8">
              No credit card. No vendor lock-in. MIT licensed.
            </p>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </div>
  )
}
