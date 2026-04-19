'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { OpenToolLogo } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TerminalLine, FloatingGrid } from '@/components/auth/shared'

const ease: [number, number, number, number] = [0.23, 1, 0.32, 1]

const TERMINAL_LINES = [
  { text: '$ npx opentool-cli', color: '#00d4ff', delay: 0.3 },
  { text: '→ Loading tools...', color: 'rgba(255,255,255,0.3)', delay: 0.8 },
  { text: '✓ github       (5 tools)', color: 'rgba(255,255,255,0.55)', delay: 1.3 },
  { text: '✓ notion        (3 tools)', color: 'rgba(255,255,255,0.55)', delay: 1.6 },
  { text: '✓ slack         (2 tools)', color: 'rgba(255,255,255,0.55)', delay: 1.9 },
  { text: '✓ neon          (4 tools)', color: 'rgba(255,255,255,0.55)', delay: 2.2 },
  { text: '✓ gmail         (3 tools)', color: 'rgba(255,255,255,0.55)', delay: 2.5 },
  { text: '→ 26 tools loaded across 10 providers', color: 'rgba(255,255,255,0.3)', delay: 3.0 },
  { text: '✓ OpenTool MCP server running', color: '#00d4ff', delay: 3.4 },
  { text: '→ Listening at http://localhost:3001/mcp', color: 'rgba(255,255,255,0.4)', delay: 3.8 },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { login } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.auth.login(email, password)
      login(res.apiKey, res.user)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
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
            <div className="absolute -inset-3 rounded-xl bg-[rgba(0,212,255,0.06)] blur-xl" />
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
            {/* Terminal window */}
            <div
              className="rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden"
              style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)' }}
            >
              {/* Title bar */}
              <div className="h-10 bg-[#0d0d24] border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between px-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#00d4ff]/40" />
                  <div className="w-3 h-3 rounded-full bg-[#8b5cf6]/40" />
                  <div className="w-3 h-3 rounded-full bg-[#ec4899]/40" />
                </div>
                <span className="text-[11px] text-[rgba(255,255,255,0.25)] font-mono">
                  opentool — mcp server
                </span>
                <div className="w-12" />
              </div>
              {/* Body */}
              <div className="bg-[#0a0a1a] p-6 space-y-1" style={{ minHeight: 280 }}>
                {TERMINAL_LINES.map((line, i) => (
                  <TerminalLine key={i} {...line} />
                ))}
                {/* Blinking cursor */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 4.2 }}
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
          <p className="text-xs text-[rgba(255,255,255,0.25)] max-w-[320px] leading-relaxed">
            One MCP server. All your tools.
            <br />
            Open source. Self-hosted. MIT licensed.
          </p>
        </motion.div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center relative bg-[#0a0a1a] border-l border-[rgba(255,255,255,0.06)]">
        {/* Subtle top glow */}
        <div
          className="absolute top-0 left-0 right-0 h-[300px] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,212,255,0.06), transparent)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="relative z-10 w-full max-w-[380px] px-8"
        >
          {/* Mobile logo */}
          <div className="flex justify-center mb-10 lg:hidden">
            <OpenToolLogo className="h-7" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
            <p className="text-sm text-[rgba(255,255,255,0.4)] mt-2">
              Sign in to your OpenTool instance.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              placeholder="••••••••"
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
                  className="text-xs text-[#ec4899] bg-[rgba(236,72,153,0.06)] border border-[rgba(236,72,153,0.12)] rounded-lg px-3 py-2.5"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button variant="primary" className="w-full h-10" loading={loading} type="submit">
              Sign In →
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
            <span className="text-[11px] text-white/20 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
          </div>

          <p className="text-xs text-[rgba(255,255,255,0.35)] text-center leading-relaxed">
            Use the CLI to log in:{' '}
            <code className="text-[#00d4ff] bg-[rgba(0,212,255,0.08)] px-1.5 py-0.5 rounded text-xs font-mono">
              opentool login
            </code>
          </p>

          <p className="text-center text-xs text-[rgba(255,255,255,0.35)] mt-6">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-[#00d4ff] hover:text-[#38e0ff] transition-colors font-medium"
            >
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
