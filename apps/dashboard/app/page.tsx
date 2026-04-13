'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useInView, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-context'
import {
  OpenToolLogo, GitHubIcon, NotionIcon, SlackIcon, LinearIcon,
  GmailIcon, GoogleCalendarIcon, StripeIcon, VercelIcon, ResendIcon, NeonIcon
} from '@/components/icons'

const Hero3D = dynamic(() => import('@/components/landing/hero-3d'), { ssr: false })

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
  { name: 'Neon', Icon: NeonIcon, tools: 1, accent: '#00E699' },
]

/* ─── Reusable Components ─── */

function FadeIn({ children, delay = 0, className = '', y = 30 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.7, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
      <span className="w-6 h-px bg-brand/40" />
      {children}
      <span className="w-6 h-px bg-brand/40" />
    </span>
  )
}

/* Spotlight card — mouse-following glow */
function SpotlightCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
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

  const handleMouse = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }, [x, y])

  const handleLeave = useCallback(() => { x.set(0); y.set(0) }, [x, y])

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
    { text: '$ npx @opentool-ts/cli mcp start', speed: 35 },
    { text: '→ Loading tools...', speed: 20 },
    { text: '✓ github        5 tools', speed: 15 },
    { text: '✓ notion         3 tools', speed: 15 },
    { text: '✓ slack          2 tools', speed: 15 },
    { text: '✓ linear         2 tools', speed: 15 },
    { text: '✓ gmail          3 tools', speed: 15 },
    { text: '→ 23 tools loaded across 10 providers', speed: 15 },
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
      const timer = setTimeout(() => {
        setLines(prev => [...prev, line.text])
        setCurrentLine('')
        setCharIdx(0)
        setLineIdx(lineIdx + 1)
      }, lineIdx === 0 ? 500 : 200)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIdx, charIdx])

  useEffect(() => {
    const timer = setInterval(() => setShowCursor(v => !v), 530)
    return () => clearInterval(timer)
  }, [])

  const getColor = (text: string) => {
    if (text.startsWith('$')) return '#22c55e'
    if (text.startsWith('✓') && text.includes('running')) return '#22c55e'
    if (text.startsWith('✓')) return 'rgba(255,255,255,0.75)'
    if (text.startsWith('→')) return 'rgba(255,255,255,0.5)'
    return 'rgba(255,255,255,0.6)'
  }

  return (
    <div className="relative rounded-2xl border border-white/[0.12] overflow-hidden bg-[#0A0A0A]" style={{ boxShadow: '0 50px 100px -25px rgba(0,0,0,0.8), 0 0 80px rgba(0,112,243,0.08), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
      {/* Title bar */}
      <div className="h-11 bg-[#111111] border-b border-white/[0.08] flex items-center justify-between px-4">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-110 transition" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:brightness-110 transition" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] hover:brightness-110 transition" />
        </div>
        <span className="text-[11px] text-white/25 font-mono tracking-wider">opentool — zsh</span>
        <div className="w-14" />
      </div>
      {/* Terminal body */}
      <div className="bg-[#0A0A0A] px-6 py-5 min-h-[220px]">
        {lines.map((line, i) => (
          <div key={i} className="font-mono text-[13px] leading-[2]" style={{ color: getColor(line) }}>{line}</div>
        ))}
        {lineIdx < LINES.length && (
          <div className="font-mono text-[13px] leading-[2]" style={{ color: getColor(currentLine || LINES[lineIdx]?.text || '') }}>
            {currentLine}
            <span className={`inline-block w-[7px] h-[15px] ml-[1px] -mb-[2px] bg-white/60 rounded-[1px] ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
          </div>
        )}
        {lineIdx >= LINES.length && (
          <div className="font-mono text-[13px] leading-[2]">
            <span className={`inline-block w-[7px] h-[15px] bg-white/60 rounded-[1px] ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
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

  return <span ref={ref}>{count}{suffix}</span>
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

/* ─── Navbar ─── */
function Navbar() {
  const { apiKey } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease }}
      className="fixed top-0 left-0 right-0 z-50 h-[64px] flex items-center justify-between px-6 md:px-10 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(0,0,0,0.75)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      }}
    >
      <Link href="/" className="flex items-center group">
        <OpenToolLogo className="h-[18px] transition-transform duration-300 group-hover:scale-105" />
      </Link>

      <div className="hidden md:flex items-center gap-1">
        {[['Features', '#features'], ['Integrations', '#tools'], ['Docs', '/docs']].map(([label, href]) => (
          <Link
            key={label}
            href={href}
            className="relative px-4 py-2 text-[13px] text-white/45 hover:text-white transition-colors duration-200 group"
          >
            {label}
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-brand group-hover:w-4/5 transition-all duration-300" />
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="https://github.com/Aditya251610/opentool"
          target="_blank"
          className="hidden sm:flex items-center gap-1.5 h-[34px] px-3.5 rounded-lg border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/[0.18] hover:bg-white/[0.03] transition-all duration-200"
        >
          <GitHubIcon size={14} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#e3b341]"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Star
        </Link>
        <Link
          href={apiKey ? '/dashboard' : '/signup'}
          className="h-[34px] px-5 rounded-lg bg-brand text-white text-[13px] font-medium inline-flex items-center hover:bg-brand-hover transition-all duration-200 shadow-[0_2px_20px_rgba(0,112,243,0.2)] hover:shadow-[0_4px_30px_rgba(0,112,243,0.35)] hover:-translate-y-[1px]"
        >
          {apiKey ? 'Dashboard' : 'Get Started'} →
        </Link>
      </div>
    </motion.nav>
  )
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-white/[0.04]">
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          <div className="col-span-2 md:col-span-1">
            <OpenToolLogo className="h-[14px]" />
            <p className="text-[13px] text-white/30 mt-3 leading-relaxed max-w-[200px]">One MCP server. All your tools. Open source forever.</p>
          </div>
          {[
            { title: 'Product', links: [['Features', '/#features'], ['Integrations', '/#tools'], ['Docs', '/docs']] },
            { title: 'Developers', links: [['Documentation', '/docs'], ['GitHub', 'https://github.com/Aditya251610/opentool'], ['Self-hosting', '/docs#self-hosting']] },
            { title: 'Legal', links: [['Privacy Policy', '/privacy'], ['Terms of Service', '/terms'], ['Report an issue', 'https://github.com/Aditya251610/opentool/issues']] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/25 mb-4">{col.title}</h4>
              <div className="flex flex-col gap-2.5">
                {col.links.map(([label, href]) => (
                  <Link key={label} href={href} className="text-[13px] text-white/40 hover:text-white transition-colors duration-200">{label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-[12px] text-white/20">© 2025 OpenTool · MIT License · Built with ♥ for developers</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-[12px] text-white/20 hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="text-[12px] text-white/20 hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────── LANDING PAGE ─────────────────── */
export default function LandingPage() {
  const { apiKey, isLoading } = useAuth()
  const [configTab, setConfigTab] = useState<'claude' | 'cursor' | 'cli'>('claude')
  const { scrollYProgress: globalProgress } = useScroll()
  const heroOpacity = useTransform(globalProgress, [0, 0.15], [1, 0])
  const heroScale = useTransform(globalProgress, [0, 0.15], [1, 0.95])

  if (isLoading) return <div className="min-h-screen bg-black" />

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <ScrollProgress />
      <Navbar />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-[100vh] flex flex-col items-center justify-center text-center px-6 pt-28 pb-24"
      >
        {/* Background effects */}
        <div className="absolute inset-0 hero-glow pointer-events-none" />
        <div className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none opacity-40" />
        <Hero3D />

        <div className="relative z-10 max-w-[740px] mx-auto">
          {/* Announcement badge */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/[0.06] pl-1.5 pr-4 py-1 mb-10"
          >
            <span className="bg-brand text-white text-[10px] font-bold px-2.5 py-[3px] rounded-full leading-none">NEW</span>
            <span className="text-[12px] text-white/60">Streamable HTTP + SSE transport now available</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-[36px] sm:text-[48px] md:text-[64px] lg:text-[80px] font-extrabold leading-[0.95] tracking-[-0.04em]"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {['One', 'MCP', 'server.'].map((w, i) => (
              <motion.span
                key={`a${i}`}
                className="inline-block mr-[0.25em] text-white"
                variants={{
                  hidden: { opacity: 0, y: 25, filter: 'blur(8px)' },
                  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0, 0, 0.2, 1] } }
                }}
              >{w}</motion.span>
            ))}
            <br />
            {['All', 'your'].map((w, i) => (
              <motion.span
                key={`b${i}`}
                className="inline-block mr-[0.25em] text-gradient"
                variants={{
                  hidden: { opacity: 0, y: 25, filter: 'blur(8px)' },
                  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0, 0, 0.2, 1] } }
                }}
              >{w}</motion.span>
            ))}
            <motion.span
              className="inline-block text-gradient-brand"
              variants={{
                hidden: { opacity: 0, y: 25, filter: 'blur(8px)' },
                visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0, 0, 0.2, 1] } }
              }}
            >tools.</motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease }}
            className="text-[17px] md:text-[19px] text-white/40 mt-7 max-w-[520px] mx-auto leading-[1.7]"
          >
            The open-source MCP server that gives AI agents secure, authenticated access to GitHub, Notion, Slack, and 10+ tools. Self-hosted. MIT licensed.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6, ease }}
            className="flex flex-wrap items-center justify-center gap-4 mt-10"
          >
            <Link
              href={apiKey ? '/dashboard' : '/signup'}
              className="group relative h-12 px-8 rounded-xl bg-brand text-white text-[15px] font-semibold inline-flex items-center gap-2 hover:bg-brand-hover transition-all duration-300 shadow-[0_2px_30px_rgba(0,112,243,0.3)] hover:shadow-[0_4px_40px_rgba(0,112,243,0.45)] hover:-translate-y-[2px]"
            >
              {apiKey ? 'Open Dashboard' : 'Get Started Free'}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-200 group-hover:translate-x-0.5"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link
              href="https://github.com/Aditya251610/opentool"
              target="_blank"
              className="h-12 px-6 rounded-xl border border-white/[0.1] text-white/70 text-[15px] font-medium inline-flex items-center gap-2.5 hover:border-white/[0.2] hover:bg-white/[0.03] hover:text-white transition-all duration-300"
            >
              <GitHubIcon size={17} /> View Source
            </Link>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-10 text-[12px] sm:text-[13px] text-white/25"
          >
            {['Open source', 'MIT License', 'Self-hostable', 'Zero vendor lock-in'].map((t, i) => (
              <span key={t} className="flex items-center gap-2">
                {i > 0 && <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-white/10" />}
                {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.8, ease }}
          className="relative z-10 w-full max-w-[700px] mt-16"
        >
          <TypedTerminal />
        </motion.div>
      </motion.section>

      {/* ═══════════════════ WORKS WITH ═══════════════════ */}
      <section className="relative py-6 border-y border-white/[0.04]">
        <div className="flex flex-wrap items-center justify-center gap-3 px-6">
          <span className="text-[11px] uppercase tracking-[0.15em] text-white/20 mr-3">Works with</span>
          {['Claude Code', 'Cursor', 'Windsurf', 'VS Code', 'Codex', 'Any MCP Client'].map((a) => (
            <span key={a} className="text-[12px] text-white/35 px-3.5 py-1.5 rounded-lg border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all duration-200">{a}</span>
          ))}
        </div>
      </section>

      {/* ═══════════════════ THE PROBLEM ═══════════════════ */}
      <section className="py-16 md:py-32 px-6 relative section-lazy">
        <div className="max-w-[1100px] mx-auto">
          <FadeIn className="text-center mb-10 md:mb-20">
            <SectionLabel>THE PROBLEM</SectionLabel>
            <h2 className="text-[28px] sm:text-[40px] md:text-[56px] font-extrabold text-white mt-4 leading-[1.05] tracking-[-0.03em]">
              Building agents is easy.<br />
              <span className="text-gradient">Connecting them to tools is not.</span>
            </h2>
            <p className="text-[17px] text-white/40 mt-5 max-w-[480px] mx-auto leading-relaxed">
              If you&apos;re writing OAuth code for the third time, something is fundamentally broken.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>,
                color: '#ef4444',
                title: 'OAuth hell',
                body: 'Every provider has different flows, token formats, and refresh logic. More auth code than agent code.',
              },
              {
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>,
                color: '#f59e0b',
                title: 'Token sprawl',
                body: 'Tokens scattered across .env files, secret managers, local configs. One expired token at 2am breaks everything.',
              },
              {
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
                color: '#8b5cf6',
                title: 'Vendor lock-in',
                body: 'Hosted platforms own your tokens and charge per seat. You can\'t audit, customize, or self-host.',
              },
            ].map((p, i) => (
              <FadeIn key={p.title} delay={i * 0.1}>
                <TiltCard>
                  <SpotlightCard className="h-full p-8">
                    <div className="mb-6" style={{ color: p.color }}>{p.icon}</div>
                    <h3 className="text-[18px] font-bold text-white">{p.title}</h3>
                    <p className="text-[14px] text-white/38 mt-3 leading-[1.7]">{p.body}</p>
                  </SpotlightCard>
                </TiltCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ ARCHITECTURE ═══════════════════ */}
      <section className="py-16 md:py-32 px-6 border-t border-white/[0.04] relative overflow-hidden section-lazy">
        <div className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none opacity-20" />
        <div className="max-w-[1100px] mx-auto relative z-10">
          <FadeIn className="text-center mb-10 md:mb-20">
            <SectionLabel>THE SOLUTION</SectionLabel>
            <h2 className="text-[28px] sm:text-[40px] md:text-[56px] font-extrabold text-white mt-4 leading-[1.05] tracking-[-0.03em]">
              One connection. <span className="text-gradient-brand">Every tool.</span>
            </h2>
            <p className="text-[17px] text-white/40 mt-5 max-w-[480px] mx-auto leading-relaxed">
              Your agent connects once to OpenTool. We handle auth, tokens, and API calls for all your tools.
            </p>
          </FadeIn>

          {/* Architecture diagram — enhanced */}
          <FadeIn className="max-w-[900px] mx-auto">
            <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 sm:p-8 md:p-12 overflow-hidden">
              {/* Subtle grid bg inside the card */}
              <div className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none opacity-10" />

              {/* Desktop: horizontal layout */}
              <div className="relative hidden md:flex items-center justify-center gap-2">
                {/* Agents (left) */}
                <div className="flex flex-col gap-4 shrink-0 z-10">
                  {[
                    { name: 'Claude Code', border: 'border-white/[0.1]' },
                    { name: 'Cursor', border: 'border-brand/25' },
                    { name: 'Your Agent', border: 'border-white/[0.06] border-dashed' },
                  ].map((a, i) => (
                    <motion.div
                      key={a.name}
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.5, ease }}
                      className={`px-6 py-3.5 rounded-xl ${a.border} border bg-surface-card/80 backdrop-blur-sm text-[13px] font-mono text-white/60 text-center whitespace-nowrap hover:bg-white/[0.04] transition-all duration-200`}
                    >{a.name}</motion.div>
                  ))}
                </div>

                {/* Connection lines left */}
                <div className="flex flex-col items-center gap-4 shrink-0 z-10">
                  {[0, 1, 2].map((i) => (
                    <svg key={i} width="80" height="28" viewBox="0 0 80 28" className="overflow-visible">
                      <motion.line
                        x1="0" y1="14" x2="64" y2="14"
                        stroke="rgba(0,112,243,0.25)"
                        strokeWidth="1"
                        strokeDasharray="6 4"
                        initial={{ strokeDashoffset: 20 }}
                        animate={{ strokeDashoffset: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.path
                        d="M62 8 L74 14 L62 20"
                        fill="none"
                        stroke="#0070F3"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: [0.4, 0.9, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      />
                    </svg>
                  ))}
                </div>

                {/* OpenTool hub */}
                <motion.div
                  className="relative shrink-0 z-10"
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4, duration: 0.6, ease }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border border-brand/20"
                      style={{ margin: `-${(i + 1) * 12}px` }}
                      animate={{ scale: [1, 1.15, 1], opacity: [0.3 - i * 0.08, 0.08, 0.3 - i * 0.08] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
                    />
                  ))}
                  <div className="relative w-[120px] h-[120px] rounded-full border-2 border-brand/40 bg-black flex flex-col items-center justify-center gap-2">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0070F3" strokeWidth="1.5">
                      <circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
                      <path d="M12 7v4m0 0l-5.5 6M12 11l5.5 6" />
                    </svg>
                    <span className="text-[9px] font-mono text-brand tracking-[0.15em] uppercase">OpenTool</span>
                  </div>
                </motion.div>

                {/* Connection lines right */}
                <div className="flex flex-col items-center gap-4 shrink-0 z-10">
                  {[0, 1, 2].map((i) => (
                    <svg key={i} width="80" height="28" viewBox="0 0 80 28" className="overflow-visible">
                      <motion.line
                        x1="0" y1="14" x2="64" y2="14"
                        stroke="rgba(0,112,243,0.25)"
                        strokeWidth="1"
                        strokeDasharray="6 4"
                        initial={{ strokeDashoffset: 20 }}
                        animate={{ strokeDashoffset: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.path
                        d="M62 8 L74 14 L62 20"
                        fill="none"
                        stroke="#0070F3"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: [0.4, 0.9, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 + 0.5 }}
                      />
                    </svg>
                  ))}
                </div>

                {/* Tools (right) */}
                <div className="flex flex-col gap-4 shrink-0 z-10">
                  {[
                    { Icon: GitHubIcon, name: 'GitHub' },
                    { Icon: SlackIcon, name: 'Slack' },
                    { Icon: NotionIcon, name: '+8 more' },
                  ].map((t, i) => (
                    <motion.div
                      key={t.name}
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.7 + i * 0.1, duration: 0.5, ease }}
                      className="flex items-center gap-3 px-6 py-3.5 rounded-xl border border-white/[0.08] bg-surface-card/80 backdrop-blur-sm hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-200"
                    >
                      <t.Icon size={18} className="text-white/50" />
                      <span className="text-[13px] font-mono text-white/60">{t.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Mobile: vertical stacked layout */}
              <div className="relative flex md:hidden flex-col items-center gap-5">
                {/* Agents */}
                <div className="flex flex-wrap justify-center gap-3 z-10">
                  {['Claude Code', 'Cursor', 'Your Agent'].map((a) => (
                    <div key={a} className="px-4 py-2.5 rounded-xl border border-white/[0.08] bg-surface-card/80 text-[12px] font-mono text-white/60">{a}</div>
                  ))}
                </div>

                {/* Down arrow */}
                <svg width="28" height="40" viewBox="0 0 28 40" className="text-brand/40">
                  <line x1="14" y1="0" x2="14" y2="30" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />
                  <path d="M8 28 L14 36 L20 28" fill="none" stroke="#0070F3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* OpenTool hub */}
                <div className="relative z-10">
                  {[0, 1].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border border-brand/20"
                      style={{ margin: `-${(i + 1) * 10}px` }}
                      animate={{ scale: [1, 1.15, 1], opacity: [0.25 - i * 0.08, 0.06, 0.25 - i * 0.08] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
                    />
                  ))}
                  <div className="w-[100px] h-[100px] rounded-full border-2 border-brand/40 bg-black flex flex-col items-center justify-center gap-1.5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0070F3" strokeWidth="1.5">
                      <circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
                      <path d="M12 7v4m0 0l-5.5 6M12 11l5.5 6" />
                    </svg>
                    <span className="text-[8px] font-mono text-brand tracking-[0.15em] uppercase">OpenTool</span>
                  </div>
                </div>

                {/* Down arrow */}
                <svg width="28" height="40" viewBox="0 0 28 40" className="text-brand/40">
                  <line x1="14" y1="0" x2="14" y2="30" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />
                  <path d="M8 28 L14 36 L20 28" fill="none" stroke="#0070F3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* Tools */}
                <div className="flex flex-wrap justify-center gap-3 z-10">
                  {[
                    { Icon: GitHubIcon, name: 'GitHub' },
                    { Icon: SlackIcon, name: 'Slack' },
                    { Icon: NotionIcon, name: '+8 more' },
                  ].map((t) => (
                    <div key={t.name} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-surface-card/80">
                      <t.Icon size={16} className="text-white/50" />
                      <span className="text-[12px] font-mono text-white/60">{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Callouts */}
          <FadeIn delay={0.2} className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mt-16">
            {[
              'Tokens never leave your server',
              '100% open source, MIT licensed',
              'Self-host in one command',
              'Works with any MCP client',
            ].map((t) => (
              <span key={t} className="flex items-center gap-2.5 text-[14px] text-white/45">
                <span className="w-5 h-5 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#0070F3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                {t}
              </span>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ FEATURES (Bento Grid) ═══════════════════ */}
      <section id="features" className="py-16 md:py-32 px-6 border-t border-white/[0.04] section-lazy">
        <div className="max-w-[1100px] mx-auto">
          <FadeIn className="text-center mb-10 md:mb-20">
            <SectionLabel>FEATURES</SectionLabel>
            <h2 className="text-[28px] sm:text-[40px] md:text-[56px] font-extrabold text-white mt-4 leading-[1.05] tracking-[-0.03em]">
              Everything your agent needs.
            </h2>
            <p className="text-[17px] text-white/40 mt-5 max-w-[460px] mx-auto leading-relaxed">
              Not a demo. Not a prototype. The execution layer agents should have had from the start.
            </p>
          </FadeIn>

          {/* Bento grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Auth Broker — 2 columns */}
            <FadeIn className="md:col-span-2">
              <SpotlightCard className="h-full p-8 md:p-10 relative">
                <div className="absolute top-0 left-0 right-0 h-px glow-line" />
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0070F3" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                    </div>
                    <h3 className="text-[22px] font-bold text-white mt-5">OAuth Auth Broker</h3>
                    <p className="text-[14px] text-white/40 mt-3 leading-[1.75]">
                      Every OAuth flow handled automatically. Tokens stored encrypted with AES-256-GCM, refreshed before expiry. Your agent never touches a token.
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/60 border border-white/[0.05] p-5 font-mono text-[12px] leading-[2] text-white/40 overflow-x-auto">
                    <div><span className="text-white/15">{'// Agent never sees the token'}</span></div>
                    <div><span className="text-brand">const</span> result = <span className="text-brand">await</span> executeTool({'{'}</div>
                    <div className="pl-4">toolId: <span className="text-[#22c55e]">&apos;github.create_issue&apos;</span>,</div>
                    <div className="pl-4">userId: <span className="text-[#22c55e]">&apos;user_abc&apos;</span>,</div>
                    <div className="pl-4">input: {'{'} title: <span className="text-[#22c55e]">&apos;Fix auth bug&apos;</span> {'}'}</div>
                    <div>{'}'})</div>
                  </div>
                </div>
              </SpotlightCard>
            </FadeIn>

            {/* Tool Registry */}
            <FadeIn delay={0.1}>
              <SpotlightCard className="h-full p-7">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
                <h3 className="text-[17px] font-bold text-white mt-5">Tool Registry</h3>
                <p className="text-[13px] text-white/38 mt-2.5 leading-[1.7]">
                  Every tool defined once in TypeScript with Zod schemas. Auto-synced to DB. Available via MCP instantly.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-6">
                  {['github', 'notion', 'slack', 'linear', 'gmail', 'gcal', '+4'].map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-white/40">{t}</span>
                  ))}
                </div>
              </SpotlightCard>
            </FadeIn>

            {/* One API Key */}
            <FadeIn delay={0.15}>
              <SpotlightCard className="h-full p-7">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
                <h3 className="text-[17px] font-bold text-white mt-5">One API Key</h3>
                <p className="text-[13px] text-white/38 mt-2.5 leading-[1.7]">
                  Point any agent at your MCP server with a single key. We resolve connected tools at runtime.
                </p>
                <div className="mt-6 flex items-center px-3.5 py-2.5 rounded-lg bg-black/60 border border-white/[0.06]">
                  <span className="text-[12px] font-mono text-[#22c55e] truncate">OPENTOOL_API_KEY=ot_ab12cd34ef...</span>
                </div>
              </SpotlightCard>
            </FadeIn>

            {/* Audit Trail */}
            <FadeIn delay={0.2}>
              <SpotlightCard className="h-full p-7">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>
                <h3 className="text-[17px] font-bold text-white mt-5">Full Audit Trail</h3>
                <p className="text-[13px] text-white/38 mt-2.5 leading-[1.7]">
                  Every tool execution logged — user, tool, input, output, duration, status.
                </p>
                <div className="mt-6 rounded-lg border border-white/[0.05] overflow-hidden divide-y divide-white/[0.04]">
                  {[
                    { tool: 'github.create_issue', ok: true, ms: '234ms' },
                    { tool: 'slack.send_message', ok: true, ms: '89ms' },
                    { tool: 'notion.query_db', ok: false, ms: '1.2s' },
                  ].map((l) => (
                    <div key={l.tool} className="flex items-center gap-2 px-3 py-2 bg-black/40">
                      <div className={`w-1.5 h-1.5 rounded-full ${l.ok ? 'bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'bg-[#ef4444] shadow-[0_0_6px_rgba(239,68,68,0.4)]'}`} />
                      <span className="text-[11px] font-mono text-white/50 flex-1 truncate">{l.tool}</span>
                      <span className="text-[10px] font-mono text-white/20">{l.ms}</span>
                    </div>
                  ))}
                </div>
              </SpotlightCard>
            </FadeIn>

            {/* Open Source */}
            <FadeIn delay={0.25}>
              <SpotlightCard className="h-full p-7">
                <GitHubIcon size={22} className="text-white/45" />
                <h3 className="text-[17px] font-bold text-white mt-5">100% Open Source</h3>
                <p className="text-[13px] text-white/38 mt-2.5 leading-[1.7]">
                  MIT licensed. Fork it, modify it, self-host it. No black boxes. Your tokens never touch anyone else&apos;s infrastructure.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-[11px] text-[#22c55e] font-medium">MIT License</span>
                  <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/40 font-medium">Self-hosted</span>
                </div>
              </SpotlightCard>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="py-16 md:py-32 px-6 border-t border-white/[0.04] relative overflow-hidden section-lazy">
        <div className="absolute inset-0 hero-glow pointer-events-none opacity-30" />
        <div className="max-w-[720px] mx-auto relative z-10">
          <FadeIn className="text-center mb-10 md:mb-20">
            <SectionLabel>HOW IT WORKS</SectionLabel>
            <h2 className="text-[28px] sm:text-[40px] md:text-[56px] font-extrabold text-white mt-4 leading-[1.05] tracking-[-0.03em]">
              Up and running in <span className="text-gradient-brand">5 minutes.</span>
            </h2>
          </FadeIn>

          <div className="relative pl-12">
            {/* Animated vertical line */}
            <motion.div
              className="absolute left-[17px] top-2 bottom-2 w-px"
              style={{ background: 'linear-gradient(180deg, rgba(0,112,243,0.3) 0%, rgba(0,112,243,0.05) 100%)' }}
              initial={{ scaleY: 0, originY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease }}
            />

            {[
              { n: '1', title: 'Deploy OpenTool', body: 'Self-host with one command. No accounts, no credit cards.', code: 'docker compose up -d' },
              { n: '2', title: 'Connect your tools', body: 'Open the dashboard, connect GitHub, Notion, Slack — OAuth in 30 seconds each.' },
              { n: '3', title: 'Get your API key', body: 'Generate a key from the dashboard. That\'s how your agent authenticates.' },
              { n: '4', title: 'Point your agent at OpenTool', body: 'Add OpenTool to your agent\'s MCP config. Done.', hasConfig: true },
              { n: '✓', title: 'Start building', body: 'Your agent can now create issues, query databases, send messages — all authenticated, all logged.', last: true },
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 0.08} className="relative mb-12 last:mb-0">
                <div className={`absolute -left-12 top-0 w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] font-bold z-10 transition-all duration-300 ${
                  step.last
                    ? 'bg-[#0a1a0a] border-2 border-[#22c55e]/30 text-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                    : 'bg-[#020a18] border-2 border-brand/30 text-brand shadow-[0_0_15px_rgba(0,112,243,0.1)]'
                }`}>
                  {step.n}
                </div>
                <h3 className="text-[18px] font-bold text-white">{step.title}</h3>
                <p className="text-[14px] text-white/40 mt-1.5 leading-relaxed">{step.body}</p>
                {step.code && (
                  <div className="mt-3 inline-block px-5 py-2.5 rounded-lg bg-surface-subtle border border-white/[0.06] font-mono text-[13px] text-[#22c55e]">
                    <span className="text-white/20">$ </span>{step.code}
                  </div>
                )}
              </FadeIn>
            ))}
          </div>

          {/* Config tabs */}
          <FadeIn delay={0.4} className="mt-8 ml-0 md:ml-12">
            <div className="flex gap-1.5 mb-4">
              {(['claude', 'cursor', 'cli'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setConfigTab(tab)}
                  className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                    configTab === tab
                      ? 'bg-brand/10 text-brand border border-brand/25 shadow-[0_0_10px_rgba(0,112,243,0.1)]'
                      : 'text-white/30 hover:text-white/60 border border-transparent hover:border-white/[0.06]'
                  }`}
                >
                  {tab === 'claude' ? 'Claude Desktop' : tab === 'cursor' ? 'Cursor' : 'Claude Code'}
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-surface-subtle border border-white/[0.06] p-6 font-mono text-[12px] text-white/45 leading-relaxed overflow-x-auto">
              <AnimatePresence mode="wait">
                <motion.pre key={configTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                  {configTab === 'claude' && `{
  "mcpServers": {
    "opentool": {
      "command": "npx",
      "args": ["@opentool-ts/cli", "mcp", "start"],
      "env": { "OPENTOOL_API_KEY": "ot_..." }
    }
  }
}`}
                  {configTab === 'cursor' && `// .cursor/mcp.json
{
  "mcpServers": {
    "opentool": {
      "command": "npx",
      "args": ["@opentool-ts/cli", "mcp", "start"],
      "env": { "OPENTOOL_API_KEY": "ot_..." }
    }
  }
}`}
                  {configTab === 'cli' && `npx @opentool-ts/cli init
claude mcp add opentool`}
                </motion.pre>
              </AnimatePresence>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ INTEGRATIONS ═══════════════════ */}
      <section id="tools" className="py-16 md:py-32 px-6 border-t border-white/[0.04] section-lazy">
        <div className="max-w-[1100px] mx-auto">
          <FadeIn className="text-center mb-10 md:mb-20">
            <SectionLabel>INTEGRATIONS</SectionLabel>
            <h2 className="text-[28px] sm:text-[40px] md:text-[56px] font-extrabold text-white mt-4 leading-[1.05] tracking-[-0.03em]">
              <Counter value={10} /> providers. <Counter value={23} /> tools.
            </h2>
            <p className="text-[17px] text-white/40 mt-5 max-w-[420px] mx-auto leading-relaxed">
              Each tool is a single TypeScript file. Add your own, open a PR.
            </p>
          </FadeIn>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {TOOLS.map((tool, i) => (
              <FadeIn key={tool.name} delay={i * 0.04}>
                <TiltCard>
                  <SpotlightCard className="p-6 text-center group">
                    <div className="relative">
                      <tool.Icon size={30} className="mx-auto text-white/50 group-hover:text-white/80 transition-colors duration-300" />
                      <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `radial-gradient(circle, ${tool.accent}10, transparent 70%)`, filter: 'blur(8px)' }} />
                    </div>
                    <div className="text-[14px] font-semibold text-white mt-4">{tool.name}</div>
                    <div className="text-[11px] text-white/25 mt-1.5 font-mono">{tool.tools} {tool.tools === 1 ? 'tool' : 'tools'}</div>
                  </SpotlightCard>
                </TiltCard>
              </FadeIn>
            ))}
          </div>

          {/* Contribute */}
          <FadeIn delay={0.4} className="mt-5">
            <div className="rounded-2xl border border-dashed border-white/[0.08] p-7 text-center hover:border-brand/20 hover:bg-brand/[0.015] transition-all duration-300 group cursor-pointer">
              <span className="text-white/15 text-3xl leading-none group-hover:text-brand/30 transition-colors">+</span>
              <p className="text-[13px] text-white/40 mt-2">
                Add your own tool — it&apos;s a single file. <Link href="/docs#adding-tools" className="text-brand hover:underline">Contributing guide →</Link>
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ OPEN SOURCE ═══════════════════ */}
      <section className="py-16 md:py-32 px-6 border-t border-white/[0.04] relative overflow-hidden section-lazy">
        <div className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none opacity-15" />
        <div className="max-w-[650px] mx-auto text-center relative z-10">
          <FadeIn>
            <div className="relative inline-block">
              <GitHubIcon size={48} className="mx-auto text-white" />
              <motion.div
                className="absolute -inset-6 rounded-full border border-white/[0.06]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <h2 className="text-[28px] sm:text-[40px] md:text-[56px] font-extrabold text-white mt-8 tracking-[-0.03em]">Built in the open.</h2>
            <p className="text-[17px] text-white/40 mt-5 max-w-[450px] mx-auto leading-relaxed">
              Read the source, audit the auth layer, contribute tools. This project exists because of developers like you.
            </p>
          </FadeIn>

          <FadeIn delay={0.15} className="flex items-center justify-center gap-8 md:gap-16 mt-14">
            {[
              { value: 'MIT', label: 'License', isText: true },
              { value: 23, label: 'Tools' },
              { value: 10, label: 'Providers' },
            ].map((s) => (
              <div key={s.label} className="group">
                <div className="text-[36px] font-extrabold text-white group-hover:text-gradient-brand transition-all duration-300">
                  {s.isText ? s.value : <Counter value={s.value as number} />}
                </div>
                <div className="text-[13px] text-white/30 mt-1 uppercase tracking-[0.08em]">{s.label}</div>
              </div>
            ))}
          </FadeIn>

          <FadeIn delay={0.25} className="flex items-center justify-center gap-4 mt-12">
            <Link href="https://github.com/Aditya251610/opentool" target="_blank" className="h-11 px-6 rounded-xl border border-white/[0.1] text-white/60 text-[14px] font-medium inline-flex items-center gap-2.5 hover:text-white hover:border-white/[0.2] hover:bg-white/[0.03] transition-all duration-200">
              ★ Star on GitHub
            </Link>
            <Link href="/docs" className="h-11 px-6 rounded-xl text-brand text-[14px] font-medium inline-flex items-center hover:underline">Read the docs →</Link>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section className="relative py-20 md:py-36 px-6 border-t border-white/[0.04]">
        <div className="absolute inset-0 hero-glow pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,112,243,0.08), transparent 65%)' }} />
        <div className="max-w-[650px] mx-auto text-center relative z-10">
          <FadeIn>
            <h2 className="text-[32px] sm:text-[40px] md:text-[60px] font-extrabold text-white leading-[1.02] tracking-[-0.035em]">
              Give your agent<br /><span className="text-gradient-brand">the tools it needs.</span>
            </h2>
            <p className="text-[18px] text-white/40 mt-5">Open source. Self-hostable. Free forever.</p>
          </FadeIn>

          <FadeIn delay={0.15} className="flex flex-wrap items-center justify-center gap-4 mt-12">
            <Link
              href={apiKey ? '/dashboard' : '/signup'}
              className="group h-13 px-8 rounded-xl bg-brand text-white text-[16px] font-semibold inline-flex items-center gap-2 hover:bg-brand-hover transition-all duration-300 shadow-[0_4px_40px_rgba(0,112,243,0.3)] hover:shadow-[0_6px_50px_rgba(0,112,243,0.45)] hover:-translate-y-[2px]"
            >
              {apiKey ? 'Open Dashboard' : 'Get Started Free'}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-200 group-hover:translate-x-0.5"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link href="https://github.com/Aditya251610/opentool" target="_blank" className="h-13 px-7 rounded-xl border border-white/[0.1] text-white/60 text-[16px] font-medium inline-flex items-center gap-2.5 hover:border-white/[0.2] hover:bg-white/[0.03] hover:text-white transition-all duration-300">
              <GitHubIcon size={18} /> View on GitHub
            </Link>
          </FadeIn>

          <FadeIn delay={0.25}>
            <p className="text-[13px] text-white/20 mt-8">No credit card. No vendor lock-in. MIT licensed.</p>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </div>
  )
}
