'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { OpenToolLogo } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ease: [number, number, number, number] = [0.23, 1, 0.32, 1]

const TERMINAL_LINES = [
  { text: '$ opentool connect github', color: '#22c55e', delay: 0.3 },
  { text: '→ Opening browser for OAuth...', color: 'rgba(255,255,255,0.3)', delay: 0.8 },
  { text: '✓ GitHub connected', color: '#22c55e', delay: 1.6 },
  { text: '', color: 'transparent', delay: 1.8 },
  { text: '$ opentool connect notion', color: '#22c55e', delay: 2.0 },
  { text: '→ Opening browser for OAuth...', color: 'rgba(255,255,255,0.3)', delay: 2.5 },
  { text: '✓ Notion connected', color: '#22c55e', delay: 3.3 },
  { text: '', color: 'transparent', delay: 3.5 },
  { text: '$ opentool tools', color: '#22c55e', delay: 3.7 },
  { text: '  github   ● connected  (5 tools)', color: 'rgba(255,255,255,0.55)', delay: 4.1 },
  { text: '  notion   ● connected  (3 tools)', color: 'rgba(255,255,255,0.55)', delay: 4.4 },
  { text: '  slack    ○ not connected', color: 'rgba(255,255,255,0.3)', delay: 4.7 },
]

function TerminalLine({ text, color, delay }: { text: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3, ease }}
    >
      <span style={{ color, fontFamily: "'Geist Mono', monospace", fontSize: 13 }}>{text}</span>
    </motion.div>
  )
}

function FloatingGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,112,243,0.06) 0%, transparent 70%)' }} />
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <defs>
          <pattern id="grid-signup" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-signup)" />
      </svg>
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,112,243,0.12), transparent)' }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { login } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await api.auth.signup(email, password, name || undefined)
      login(res.apiKey, res.user)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-black">
      {/* Left — Brand + Terminal */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden">
        <FloatingGrid />

        {/* Top — Logo with glow */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="relative z-10"
        >
          <div className="relative inline-block">
            <div className="absolute -inset-3 rounded-xl bg-[rgba(0,112,243,0.06)] blur-xl" />
            <OpenToolLogo className="h-9 relative" />
          </div>
        </motion.div>

        {/* Center — Terminal */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="w-full max-w-[520px]"
          >
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden"
              style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)' }}>
              <div className="h-10 bg-[#111111] border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between px-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                </div>
                <span className="text-[11px] text-[rgba(255,255,255,0.25)] font-mono">opentool — connect tools</span>
                <div className="w-12" />
              </div>
              <div className="bg-[#0A0A0A] p-6 space-y-1" style={{ minHeight: 300 }}>
                {TERMINAL_LINES.map((line, i) => (
                  <TerminalLine key={i} {...line} />
                ))}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 5.2 }}
                  className="mt-2"
                >
                  <motion.span
                    className="inline-block w-2 h-[14px] bg-[rgba(255,255,255,0.6)]"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom — Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="relative z-10"
        >
          <p className="text-[13px] text-[rgba(255,255,255,0.25)] max-w-[320px] leading-relaxed">
            Connect once. Use everything. That&apos;s it.<br />
            Your tokens never leave your server.
          </p>
        </motion.div>
      </div>

      {/* Right — Signup Form */}
      <div className="flex-1 flex items-center justify-center relative bg-[#0A0A0A] border-l border-[rgba(255,255,255,0.06)]">
        <div className="absolute top-0 left-0 right-0 h-[300px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,112,243,0.06), transparent)' }} />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="relative z-10 w-full max-w-[380px] px-8"
        >
          {/* Mobile logo */}
          <div className="flex justify-center mb-10 lg:hidden">
            <OpenToolLogo className="h-8" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Create your account</h1>
            <p className="text-[14px] text-[rgba(255,255,255,0.4)] mt-2">
              Set up your self-hosted OpenTool instance.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Name"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[13px] text-[#ef4444] bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.12)] rounded-lg px-3 py-2.5"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button variant="primary" className="w-full h-10" loading={loading} type="submit">
              Create Account →
            </Button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
            <span className="text-[11px] text-[rgba(255,255,255,0.2)] uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
          </div>

          <p className="text-[13px] text-[rgba(255,255,255,0.35)] text-center leading-relaxed">
            Self-host with one command:{' '}
            <code className="text-[#0070F3] bg-[rgba(0,112,243,0.08)] px-1.5 py-0.5 rounded text-[12px] font-mono">
              docker compose up -d
            </code>
          </p>

          <p className="text-center text-[13px] text-[rgba(255,255,255,0.35)] mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#0070F3] hover:text-[#3b82f6] transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
