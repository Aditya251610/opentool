'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
  OpenToolLogo, GitHubIcon, NotionIcon, SlackIcon, LinearIcon,
  GmailIcon, GoogleCalendarIcon, StripeIcon, VercelIcon, ResendIcon, NeonIcon
} from '@/components/icons'

/* ─── Constants ─── */

const ease: [number, number, number, number] = [0.23, 1, 0.32, 1]

const TERMINAL_LINES = [
  { text: '$ npx @opentool-ts/cli mcp start', color: '#22c55e', delay: 0.6 },
  { text: '→ Loading tools...', color: 'rgba(255,255,255,0.3)', delay: 1.2 },
  { text: '✓ github        5 tools', color: 'rgba(255,255,255,0.55)', delay: 1.7 },
  { text: '✓ notion         3 tools', color: 'rgba(255,255,255,0.55)', delay: 2.0 },
  { text: '✓ slack          2 tools', color: 'rgba(255,255,255,0.55)', delay: 2.3 },
  { text: '✓ linear         2 tools', color: 'rgba(255,255,255,0.55)', delay: 2.6 },
  { text: '✓ gmail          3 tools', color: 'rgba(255,255,255,0.55)', delay: 2.9 },
  { text: '→ 23 tools loaded across 10 providers', color: 'rgba(255,255,255,0.3)', delay: 3.4 },
  { text: '✓ MCP server running on :3001/mcp', color: '#22c55e', delay: 3.8 },
]

const TOOLS: { name: string; Icon: typeof GitHubIcon; tools: number }[] = [
  { name: 'GitHub', Icon: GitHubIcon, tools: 5 },
  { name: 'Notion', Icon: NotionIcon, tools: 3 },
  { name: 'Slack', Icon: SlackIcon, tools: 2 },
  { name: 'Linear', Icon: LinearIcon, tools: 2 },
  { name: 'Gmail', Icon: GmailIcon, tools: 3 },
  { name: 'Google Cal', Icon: GoogleCalendarIcon, tools: 2 },
  { name: 'Stripe', Icon: StripeIcon, tools: 2 },
  { name: 'Vercel', Icon: VercelIcon, tools: 2 },
  { name: 'Resend', Icon: ResendIcon, tools: 1 },
  { name: 'Neon', Icon: NeonIcon, tools: 1 },
]

/* ─── Reusable bits ─── */

function TerminalLine({ text, color, delay }: { text: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25, ease }}
    >
      <span style={{ color, fontFamily: "'Geist Mono', monospace", fontSize: 13, lineHeight: '1.9' }}>{text}</span>
    </motion.div>
  )
}

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.55, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#0070F3]">{children}</span>
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
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center justify-between px-6 md:px-10 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(0,0,0,0.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      }}
    >
      <Link href="/" className="flex items-center"><OpenToolLogo className="h-[18px]" /></Link>

      <div className="hidden md:flex items-center gap-7">
        {[['Features', '#features'], ['Tools', '#tools'], ['Docs', '/docs']].map(([label, href]) => (
          <Link key={label} href={href} className="text-[13px] text-[rgba(255,255,255,0.45)] hover:text-white transition-colors duration-200">{label}</Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="https://github.com/Aditya251610/opentool"
          target="_blank"
          className="hidden sm:flex items-center gap-1.5 h-[32px] px-3 rounded-lg border border-[rgba(255,255,255,0.08)] text-[13px] text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.18)] transition-all duration-200"
        >
          <GitHubIcon size={14} /> GitHub
        </Link>
        <Link
          href={apiKey ? '/dashboard' : '/signup'}
          className="h-[32px] px-4 rounded-lg bg-[#0070F3] text-white text-[13px] font-medium inline-flex items-center hover:bg-[#2884FF] transition-colors duration-200"
        >
          {apiKey ? 'Dashboard' : 'Get Started'} →
        </Link>
      </div>
    </nav>
  )
}

/* ─── Footer ─── */

function Footer() {
  return (
    <footer className="border-t border-[#1A1A1A]">
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          <div className="col-span-2 md:col-span-1">
            <OpenToolLogo className="h-[14px]" />
            <p className="text-[13px] text-[rgba(255,255,255,0.3)] mt-3 leading-relaxed max-w-[180px]">One MCP server.<br />All your tools.</p>
          </div>
          {[
            { title: 'Product', links: [['Features', '/#features'], ['Tools', '/#tools'], ['Docs', '/docs']] },
            { title: 'Developers', links: [['Documentation', '/docs'], ['GitHub', 'https://github.com/Aditya251610/opentool'], ['Self-hosting', '/docs#self-hosting']] },
            { title: 'Legal', links: [['Privacy Policy', '/privacy'], ['Terms of Service', '/terms'], ['Report an issue', 'https://github.com/Aditya251610/opentool/issues']] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgba(255,255,255,0.25)] mb-4">{col.title}</h4>
              <div className="flex flex-col gap-2.5">
                {col.links.map(([label, href]) => (
                  <Link key={label} href={href} className="text-[13px] text-[rgba(255,255,255,0.4)] hover:text-white transition-colors">{label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="text-[12px] text-[rgba(255,255,255,0.2)]">© 2025 OpenTool · MIT License · Open source</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-[12px] text-[rgba(255,255,255,0.2)] hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="text-[12px] text-[rgba(255,255,255,0.2)] hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ─── Page ─── */

export default function LandingPage() {
  const { apiKey, isLoading } = useAuth()
  const [configTab, setConfigTab] = useState<'claude' | 'cursor' | 'cli'>('claude')

  if (isLoading) return null

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar />

      {/* ════════════════════ HERO ════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">
        {/* Ambient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ width: '100%', maxWidth: 900, height: '55%', background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,112,243,0.10), transparent)' }}
        />

        <div className="relative z-10 max-w-[680px] mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,112,243,0.25)] bg-[rgba(0,112,243,0.06)] pl-1 pr-3 py-0.5 mb-8"
          >
            <span className="bg-[#0070F3] text-white text-[10px] font-bold px-2 py-[2px] rounded-full leading-none">NEW</span>
            <span className="text-[12px] text-[rgba(255,255,255,0.6)]">MCP HTTP transport now available</span>
          </motion.div>

          {/* Headline — word-by-word reveal */}
          <motion.h1
            className="text-[44px] sm:text-[60px] md:text-[72px] font-bold leading-[1.02] tracking-[-0.035em]"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.035 } } }}
          >
            {['One', 'MCP', 'server.'].map((w, i) => (
              <motion.span key={`a${i}`} className="inline-block mr-[0.28em] text-white" variants={{ hidden: { opacity: 0, y: 18, filter: 'blur(6px)' }, visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: [0,0,0.2,1] } } }}>{w}</motion.span>
            ))}
            <br />
            {['All', 'your', 'tools.'].map((w, i) => (
              <motion.span key={`b${i}`} className="inline-block mr-[0.28em]" style={{ background: 'linear-gradient(135deg,#FFFFFF,rgba(255,255,255,0.55))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} variants={{ hidden: { opacity: 0, y: 18, filter: 'blur(6px)' }, visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: [0,0,0.2,1] } } }}>{w}</motion.span>
            ))}
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease }}
            className="text-[16px] md:text-[18px] text-[rgba(255,255,255,0.45)] mt-6 max-w-[480px] mx-auto leading-relaxed"
          >
            Open-source MCP server that gives AI agents authenticated access to GitHub, Notion, Slack, and 10+ tools. Self-hosted. MIT licensed.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5, ease }}
            className="flex flex-wrap items-center justify-center gap-3 mt-10"
          >
            <Link href={apiKey ? '/dashboard' : '/signup'} className="h-11 px-7 rounded-[10px] bg-[#0070F3] text-white text-[15px] font-medium inline-flex items-center hover:bg-[#005FD4] hover:-translate-y-px transition-all duration-200 shadow-[0_2px_20px_rgba(0,112,243,0.25)]">
              {apiKey ? 'Open Dashboard' : 'Get Started Free'} →
            </Link>
            <Link href="https://github.com/Aditya251610/opentool" target="_blank" className="h-11 px-6 rounded-[10px] border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.7)] text-[15px] inline-flex items-center gap-2 hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.03)] transition-all duration-200">
              <GitHubIcon size={16} /> View on GitHub
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="flex items-center justify-center gap-5 mt-8 text-[13px] text-[rgba(255,255,255,0.3)]"
          >
            <span>⭐ Open source</span>
            <span className="w-1 h-1 rounded-full bg-[rgba(255,255,255,0.12)]" />
            <span>MIT License</span>
            <span className="w-1 h-1 rounded-full bg-[rgba(255,255,255,0.12)]" />
            <span>Self-hostable</span>
          </motion.div>
        </div>

        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.65, ease }}
          className="relative z-10 w-full max-w-[680px] mt-16"
        >
          <div className="rounded-xl border border-[rgba(255,255,255,0.07)] overflow-hidden" style={{ boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)' }}>
            <div className="h-10 bg-[#0F0F0F] border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between px-4">
              <div className="flex gap-[7px]">
                <div className="w-[11px] h-[11px] rounded-full bg-[#FF5F57]" />
                <div className="w-[11px] h-[11px] rounded-full bg-[#FFBD2E]" />
                <div className="w-[11px] h-[11px] rounded-full bg-[#27C93F]" />
              </div>
              <span className="text-[11px] text-[rgba(255,255,255,0.2)] font-mono">opentool</span>
              <div className="w-12" />
            </div>
            <div className="bg-[#080808] px-6 py-5">
              {TERMINAL_LINES.map((line, i) => <TerminalLine key={i} {...line} />)}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.2 }} className="mt-1">
                <motion.span className="inline-block w-[7px] h-[15px] bg-[rgba(255,255,255,0.5)] rounded-[1px]" animate={{ opacity: [1, 0] }} transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }} />
              </motion.div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        </motion.div>
      </section>

      {/* ════════════════════ WORKS WITH ════════════════════ */}
      <section className="border-y border-[rgba(255,255,255,0.05)] py-5">
        <div className="flex flex-wrap items-center justify-center gap-2.5 px-6">
          <span className="text-[12px] text-[rgba(255,255,255,0.25)] mr-2">Works with</span>
          {['Claude Code', 'Cursor', 'Windsurf', 'VS Code', 'Codex'].map((a) => (
            <span key={a} className="text-[12px] text-[rgba(255,255,255,0.35)] px-3 py-1 rounded-md border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">{a}</span>
          ))}
          <span className="text-[12px] text-[rgba(255,255,255,0.2)] ml-2">+ any MCP client</span>
        </div>
      </section>

      {/* ════════════════════ THE PROBLEM ════════════════════ */}
      <section className="py-28 px-6">
        <div className="max-w-[1000px] mx-auto">
          <FadeIn className="text-center mb-16">
            <SectionLabel>THE PROBLEM</SectionLabel>
            <h2 className="text-[36px] md:text-[48px] font-bold text-white mt-3 leading-[1.08] tracking-[-0.025em]">
              Building agents is easy.<br />Connecting them to tools is not.
            </h2>
            <p className="text-[16px] text-[rgba(255,255,255,0.4)] mt-4 max-w-[460px] mx-auto leading-relaxed">
              If you&apos;re writing OAuth code for the third time, something is broken.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-[1px] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)]">
            {[
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#ef4444]"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>,
                title: 'OAuth hell',
                body: 'Every provider has different flows, token formats, and refresh logic. You end up with more auth code than agent code.',
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#f59e0b]"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>,
                title: 'Token sprawl',
                body: 'Tokens scattered across .env files, secret managers, local configs. One expired token at 2am breaks everything.',
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#8b5cf6]"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
                title: 'Vendor lock-in',
                body: 'Hosted platforms own your tokens and charge per seat. You can\'t audit, customize, or self-host.',
              },
            ].map((p, i) => (
              <FadeIn key={p.title} delay={i * 0.1} className="bg-[#080808] hover:bg-[#0C0C0C] p-8 transition-colors duration-300">
                <div className="mb-5">{p.icon}</div>
                <h3 className="text-[16px] font-semibold text-white">{p.title}</h3>
                <p className="text-[14px] text-[rgba(255,255,255,0.38)] mt-2 leading-[1.65]">{p.body}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ THE SOLUTION / ARCHITECTURE ════════════════════ */}
      <section className="py-28 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="max-w-[1000px] mx-auto">
          <FadeIn className="text-center mb-16">
            <SectionLabel>THE SOLUTION</SectionLabel>
            <h2 className="text-[36px] md:text-[48px] font-bold text-white mt-3 leading-[1.08] tracking-[-0.025em]">
              One connection. Every tool.
            </h2>
            <p className="text-[16px] text-[rgba(255,255,255,0.4)] mt-4 max-w-[440px] mx-auto leading-relaxed">
              Connect once, use everywhere. Tokens stay on your server. Forever free.
            </p>
          </FadeIn>

          {/* Architecture diagram */}
          <FadeIn className="max-w-[760px] mx-auto">
            <div className="flex items-center justify-center gap-4 md:gap-6">
              {/* Agents column */}
              <div className="flex flex-col gap-2.5 shrink-0">
                {['Claude Code', 'Cursor', 'Your Agent'].map((a) => (
                  <div key={a} className="px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] text-[13px] font-mono text-[rgba(255,255,255,0.5)] text-center whitespace-nowrap">{a}</div>
                ))}
              </div>

              {/* Arrows left */}
              <div className="flex flex-col items-center gap-2.5 shrink-0">
                {[0, 1, 2].map((i) => (
                  <svg key={i} width="40" height="28" viewBox="0 0 40 28" className="text-[rgba(255,255,255,0.1)]">
                    <line x1="0" y1="14" x2="36" y2="14" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                    <path d="M33 10 L39 14 L33 18" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                ))}
              </div>

              {/* OpenTool box */}
              <div className="relative shrink-0">
                <motion.div
                  className="absolute -inset-[6px] rounded-[18px] border border-[rgba(0,112,243,0.15)]"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="relative rounded-xl border border-[rgba(0,112,243,0.35)] bg-[rgba(0,112,243,0.05)] px-6 py-5 text-center" style={{ boxShadow: '0 0 40px rgba(0,112,243,0.08)' }}>
                  <OpenToolLogo className="h-[14px] mx-auto" color="#0070F3" />
                  <div className="text-[11px] text-[rgba(255,255,255,0.35)] mt-1.5 font-mono">MCP Server</div>
                </div>
              </div>

              {/* Arrows right */}
              <div className="flex flex-col items-center gap-2.5 shrink-0">
                {[0, 1, 2].map((i) => (
                  <svg key={i} width="40" height="28" viewBox="0 0 40 28" className="text-[rgba(255,255,255,0.1)]">
                    <line x1="0" y1="14" x2="36" y2="14" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                    <path d="M33 10 L39 14 L33 18" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                ))}
              </div>

              {/* Tools column */}
              <div className="flex flex-col gap-2.5 shrink-0">
                {[
                  { Icon: GitHubIcon, name: 'GitHub' },
                  { Icon: SlackIcon, name: 'Slack' },
                  { Icon: NotionIcon, name: '+8 more' },
                ].map((t) => (
                  <div key={t.name} className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">
                    <t.Icon size={15} className="text-[rgba(255,255,255,0.5)]" />
                    <span className="text-[13px] font-mono text-[rgba(255,255,255,0.5)]">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Callouts */}
          <FadeIn delay={0.2} className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-14 text-[14px]">
            {[
              'Tokens never leave your server',
              '100% open source, MIT licensed',
              'Self-host in one command',
              'Works with any MCP client',
            ].map((t) => (
              <span key={t} className="flex items-center gap-2 text-[rgba(255,255,255,0.5)]">
                <span className="text-[#0070F3]">✓</span> {t}
              </span>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ════════════════════ FEATURES ════════════════════ */}
      <section id="features" className="py-28 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="max-w-[1000px] mx-auto">
          <FadeIn className="text-center mb-16">
            <SectionLabel>FEATURES</SectionLabel>
            <h2 className="text-[36px] md:text-[48px] font-bold text-white mt-3 leading-[1.08] tracking-[-0.025em]">
              Everything your agent needs.
            </h2>
            <p className="text-[16px] text-[rgba(255,255,255,0.4)] mt-4 max-w-[420px] mx-auto leading-relaxed">
              Not a demo. Not a prototype. The execution layer agents should have had from the start.
            </p>
          </FadeIn>

          {/* Feature cards — proper 2-column layout */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Auth Broker — full width */}
            <FadeIn className="md:col-span-2">
              <div className="relative rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#080808] p-8 md:p-10 overflow-hidden group hover:border-[rgba(255,255,255,0.1)] transition-colors duration-300">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,112,243,0.3)] to-transparent" />
                <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-[rgba(0,112,243,0.08)] border border-[rgba(0,112,243,0.15)] flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0070F3" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                    </div>
                    <h3 className="text-[20px] font-semibold text-white mt-5">OAuth Auth Broker</h3>
                    <p className="text-[14px] text-[rgba(255,255,255,0.4)] mt-3 leading-[1.7]">
                      Every OAuth flow handled automatically. Tokens stored encrypted with AES-256-GCM, refreshed before expiry, revoked instantly. Your agent never touches a token.
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#050505] border border-[rgba(255,255,255,0.05)] p-5 font-mono text-[12px] leading-[1.9] text-[rgba(255,255,255,0.45)] overflow-x-auto">
                    <div><span className="text-[rgba(255,255,255,0.2)]">{'// Agent never sees the token'}</span></div>
                    <div><span className="text-[#0070F3]">const</span> result = <span className="text-[#0070F3]">await</span> executeTool({'{'}</div>
                    <div className="pl-4">toolId: <span className="text-[#22c55e]">&apos;github.create_issue&apos;</span>,</div>
                    <div className="pl-4">userId: <span className="text-[#22c55e]">&apos;user_abc&apos;</span>,</div>
                    <div className="pl-4">input: {'{'} title: <span className="text-[#22c55e]">&apos;Fix auth bug&apos;</span> {'}'}</div>
                    <div>{'}'})</div>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Tool Registry */}
            <FadeIn delay={0.1}>
              <div className="h-full rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#080808] p-7 hover:border-[rgba(255,255,255,0.1)] transition-colors duration-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                <h3 className="text-[16px] font-semibold text-white mt-4">Tool Registry</h3>
                <p className="text-[13px] text-[rgba(255,255,255,0.38)] mt-2 leading-[1.65]">
                  Every tool defined once in TypeScript with Zod schemas. Auto-synced to DB. Available via MCP instantly.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-5">
                  {['github', 'notion', 'slack', 'linear', 'gmail', 'gcal', '+4'].map((t) => (
                    <span key={t} className="px-2 py-[3px] rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[11px] font-mono text-[rgba(255,255,255,0.4)]">{t}</span>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* One API Key */}
            <FadeIn delay={0.15}>
              <div className="h-full rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#080808] p-7 hover:border-[rgba(255,255,255,0.1)] transition-colors duration-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
                <h3 className="text-[16px] font-semibold text-white mt-4">One API key</h3>
                <p className="text-[13px] text-[rgba(255,255,255,0.38)] mt-2 leading-[1.65]">
                  Point any agent at your MCP server with a single key. We resolve which tools you&apos;ve connected at runtime.
                </p>
                <div className="mt-5 flex items-center px-3 py-2 rounded-lg bg-[#050505] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-[12px] font-mono text-[#22c55e] truncate">OPENTOOL_API_KEY=ot_ab12cd34ef56...</span>
                </div>
              </div>
            </FadeIn>

            {/* Audit Trail */}
            <FadeIn delay={0.2}>
              <div className="h-full rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#080808] p-7 hover:border-[rgba(255,255,255,0.1)] transition-colors duration-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>
                <h3 className="text-[16px] font-semibold text-white mt-4">Full Audit Trail</h3>
                <p className="text-[13px] text-[rgba(255,255,255,0.38)] mt-2 leading-[1.65]">
                  Every tool execution logged — user, tool, input, output, duration, status. Know exactly what your agent did.
                </p>
                <div className="mt-5 rounded-lg border border-[rgba(255,255,255,0.05)] overflow-hidden divide-y divide-[rgba(255,255,255,0.04)]">
                  {[
                    { tool: 'github.create_issue', ok: true, ms: '234ms' },
                    { tool: 'slack.send_message', ok: true, ms: '89ms' },
                    { tool: 'notion.query_db', ok: false, ms: '1.2s' },
                  ].map((l) => (
                    <div key={l.tool} className="flex items-center gap-2 px-3 py-2 bg-[#050505]">
                      <div className={`w-1.5 h-1.5 rounded-full ${l.ok ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                      <span className="text-[11px] font-mono text-[rgba(255,255,255,0.5)] flex-1 truncate">{l.tool}</span>
                      <span className="text-[10px] font-mono text-[rgba(255,255,255,0.25)]">{l.ms}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Open Source */}
            <FadeIn delay={0.25}>
              <div className="h-full rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#080808] p-7 hover:border-[rgba(255,255,255,0.1)] transition-colors duration-300">
                <GitHubIcon size={20} className="text-[rgba(255,255,255,0.45)]" />
                <h3 className="text-[16px] font-semibold text-white mt-4">100% Open Source</h3>
                <p className="text-[13px] text-[rgba(255,255,255,0.38)] mt-2 leading-[1.65]">
                  MIT licensed. Fork it, modify it, self-host it. No black boxes. Your tokens never touch anyone else&apos;s infrastructure.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ════════════════════ HOW IT WORKS ════════════════════ */}
      <section className="py-28 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="max-w-[680px] mx-auto">
          <FadeIn className="text-center mb-16">
            <SectionLabel>HOW IT WORKS</SectionLabel>
            <h2 className="text-[36px] md:text-[48px] font-bold text-white mt-3 leading-[1.08] tracking-[-0.025em]">
              Up and running in 5 minutes.
            </h2>
          </FadeIn>

          <div className="relative pl-10">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[rgba(255,255,255,0.06)]" />

            {[
              { n: '1', title: 'Deploy OpenTool', body: 'Self-host with one command. No accounts, no credit cards.', code: 'docker compose up -d' },
              { n: '2', title: 'Connect your tools', body: 'Open the dashboard, connect GitHub, Notion, Slack — OAuth in 30 seconds each.' },
              { n: '3', title: 'Get your API key', body: 'Generate a key from the dashboard. That\'s how your agent authenticates.' },
              { n: '4', title: 'Point your agent at OpenTool', body: 'Add OpenTool to your agent\'s MCP config. Done.', hasConfig: true },
              { n: '✓', title: 'Start building', body: 'Your agent can now create issues, query databases, send messages — all authenticated, all logged.', last: true },
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 0.08} className="relative mb-10 last:mb-0">
                <div className={`absolute -left-10 top-0.5 w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-semibold z-10 ${
                  step.last
                    ? 'bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-[#22c55e]'
                    : 'bg-[rgba(0,112,243,0.08)] border border-[rgba(0,112,243,0.25)] text-[#0070F3]'
                }`}>
                  {step.n}
                </div>
                <h3 className="text-[17px] font-semibold text-white">{step.title}</h3>
                <p className="text-[14px] text-[rgba(255,255,255,0.4)] mt-1 leading-relaxed">{step.body}</p>
                {step.code && (
                  <div className="mt-3 inline-block px-4 py-2 rounded-lg bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] font-mono text-[13px] text-[#22c55e]">{step.code}</div>
                )}
              </FadeIn>
            ))}
          </div>

          {/* Config tabs */}
          <FadeIn delay={0.4} className="mt-6 ml-10">
            <div className="flex gap-1 mb-3">
              {(['claude', 'cursor', 'cli'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setConfigTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-[12px] transition-all cursor-pointer ${
                    configTab === tab
                      ? 'bg-[rgba(0,112,243,0.08)] text-[#0070F3] border border-[rgba(0,112,243,0.2)]'
                      : 'text-[rgba(255,255,255,0.3)] hover:text-white border border-transparent'
                  }`}
                >
                  {tab === 'claude' ? 'Claude Desktop' : tab === 'cursor' ? 'Cursor' : 'Claude Code'}
                </button>
              ))}
            </div>
            <div className="rounded-lg bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] p-5 font-mono text-[12px] text-[rgba(255,255,255,0.45)] leading-relaxed overflow-x-auto">
              <AnimatePresence mode="wait">
                <motion.pre key={configTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
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

      {/* ════════════════════ SUPPORTED TOOLS ════════════════════ */}
      <section id="tools" className="py-28 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="max-w-[1000px] mx-auto">
          <FadeIn className="text-center mb-16">
            <SectionLabel>INTEGRATIONS</SectionLabel>
            <h2 className="text-[36px] md:text-[48px] font-bold text-white mt-3 leading-[1.08] tracking-[-0.025em]">
              10 providers. 23 tools.
            </h2>
            <p className="text-[16px] text-[rgba(255,255,255,0.4)] mt-4 max-w-[380px] mx-auto leading-relaxed">
              Each tool is a single TypeScript file. Add your own, open a PR.
            </p>
          </FadeIn>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {TOOLS.map((tool, i) => (
              <FadeIn key={tool.name} delay={i * 0.04}>
                <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#080808] p-5 text-center hover:border-[rgba(255,255,255,0.12)] hover:-translate-y-px transition-all duration-200">
                  <tool.Icon size={26} className="mx-auto text-[rgba(255,255,255,0.6)]" />
                  <div className="text-[13px] font-medium text-white mt-3">{tool.name}</div>
                  <div className="text-[11px] text-[rgba(255,255,255,0.3)] mt-2">{tool.tools} {tool.tools === 1 ? 'tool' : 'tools'}</div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Contribute */}
          <FadeIn delay={0.4} className="mt-4">
            <div className="rounded-xl border border-dashed border-[rgba(255,255,255,0.08)] p-6 text-center hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.01)] transition-all duration-200">
              <span className="text-[rgba(255,255,255,0.15)] text-2xl leading-none">+</span>
              <p className="text-[13px] text-[rgba(255,255,255,0.4)] mt-2">
                Add your own tool — it&apos;s a single file. <Link href="/docs#adding-tools" className="text-[#0070F3] hover:underline">Contributing guide →</Link>
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ════════════════════ OPEN SOURCE ════════════════════ */}
      <section className="py-28 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="max-w-[600px] mx-auto text-center">
          <FadeIn>
            <GitHubIcon size={40} className="mx-auto text-white" />
            <h2 className="text-[36px] md:text-[48px] font-bold text-white mt-6 tracking-[-0.025em]">Built in the open.</h2>
            <p className="text-[16px] text-[rgba(255,255,255,0.4)] mt-4 max-w-[420px] mx-auto leading-relaxed">
              Read the source, audit the auth layer, contribute tools. This project exists because of developers like you.
            </p>
          </FadeIn>

          <FadeIn delay={0.15} className="flex items-center justify-center gap-12 mt-12">
            {[
              { value: 'MIT', label: 'License' },
              { value: '23', label: 'Tools' },
              { value: '10', label: 'Providers' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-[28px] font-bold text-white">{s.value}</div>
                <div className="text-[13px] text-[rgba(255,255,255,0.35)] mt-0.5">{s.label}</div>
              </div>
            ))}
          </FadeIn>

          <FadeIn delay={0.25} className="flex items-center justify-center gap-3 mt-10">
            <Link href="https://github.com/Aditya251610/opentool" target="_blank" className="h-10 px-5 rounded-lg border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.6)] text-[14px] inline-flex items-center gap-2 hover:text-white hover:border-[rgba(255,255,255,0.25)] transition-all duration-200">
              ★ Star on GitHub
            </Link>
            <Link href="/docs" className="h-10 px-5 rounded-lg text-[#0070F3] text-[14px] inline-flex items-center hover:underline">Read the docs →</Link>
          </FadeIn>
        </div>
      </section>

      {/* ════════════════════ FINAL CTA ════════════════════ */}
      <section className="relative py-32 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,112,243,0.06), transparent 70%)' }} />
        <div className="max-w-[600px] mx-auto text-center relative z-10">
          <FadeIn>
            <h2 className="text-[36px] md:text-[52px] font-bold text-white leading-[1.05] tracking-[-0.025em]">
              Give your agent<br />the tools it needs.
            </h2>
            <p className="text-[17px] text-[rgba(255,255,255,0.4)] mt-4">Open source. Self-hostable. Free forever.</p>
          </FadeIn>

          <FadeIn delay={0.15} className="flex flex-wrap items-center justify-center gap-3 mt-10">
            <Link href={apiKey ? '/dashboard' : '/signup'} className="h-11 px-7 rounded-[10px] bg-[#0070F3] text-white text-[15px] font-medium inline-flex items-center hover:bg-[#005FD4] hover:-translate-y-px transition-all duration-200 shadow-[0_2px_20px_rgba(0,112,243,0.25)]">
              {apiKey ? 'Open Dashboard' : 'Get Started Free'} →
            </Link>
            <Link href="https://github.com/Aditya251610/opentool" target="_blank" className="h-11 px-6 rounded-[10px] border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.6)] text-[15px] inline-flex items-center gap-2 hover:border-[rgba(255,255,255,0.25)] transition-all duration-200">
              <GitHubIcon size={16} /> View on GitHub
            </Link>
          </FadeIn>

          <FadeIn delay={0.25}>
            <p className="text-[13px] text-[rgba(255,255,255,0.2)] mt-6">No credit card. No vendor lock-in. MIT licensed.</p>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </div>
  )
}
