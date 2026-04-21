'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { orgApi } from '@/lib/api'

interface UsageData {
  members: { current: number; limit: number }
  keys: { current: number; limit: number }
  toolExecs: { current: number; limit: number }
  apiCalls: { current: number; limit: number }
}

const PLAN_LIMITS: Record<string, UsageData> = {
  free: {
    members: { current: 0, limit: 5 },
    keys: { current: 0, limit: 10 },
    toolExecs: { current: 0, limit: 100 },
    apiCalls: { current: 0, limit: 1000 },
  },
  pro: {
    members: { current: 0, limit: 50 },
    keys: { current: 0, limit: 100 },
    toolExecs: { current: 0, limit: 1000 },
    apiCalls: { current: 0, limit: 10000 },
  },
  enterprise: {
    members: { current: 0, limit: 500 },
    keys: { current: 0, limit: 1000 },
    toolExecs: { current: 0, limit: 10000 },
    apiCalls: { current: 0, limit: 100000 },
  },
}

function getColor(pct: number): string {
  if (pct >= 90) return '#ef4444'
  if (pct >= 70) return '#f59e0b'
  return '#10b981'
}

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number }) {
  const pct = Math.min((current / limit) * 100, 100)
  const color = getColor(pct)

  return (
    <div className="p-4 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-white/70">{label}</span>
        <span className="text-xs font-mono" style={{ color }}>
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        />
      </div>
      <p className="text-[11px] text-white/30 mt-1.5">{pct.toFixed(0)}% used</p>
    </div>
  )
}

const PLAN_FEATURES = [
  { feature: 'Members', free: '5', pro: '50', enterprise: '500' },
  { feature: 'API Keys', free: '10', pro: '100', enterprise: '1,000' },
  { feature: 'Tool Executions/hr', free: '100', pro: '1,000', enterprise: '10,000' },
  { feature: 'API Calls/hr', free: '1,000', pro: '10,000', enterprise: '100,000' },
  { feature: 'SSO', free: '—', pro: '✓', enterprise: '✓' },
  { feature: 'Audit Logs', free: '7 days', pro: '90 days', enterprise: '365 days' },
  { feature: 'Custom Policies', free: '—', pro: '✓', enterprise: '✓' },
  { feature: 'Priority Support', free: '—', pro: '—', enterprise: '✓' },
]

export default function OrgUsagePage() {
  const { activeOrg } = useAuth()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeOrg) return
    async function load() {
      try {
        const data = await orgApi.getUsage(activeOrg!.org.slug)
        setUsage(data)
      } catch {
        // Fallback: use plan defaults
        const plan = (activeOrg as any)?.org?.plan || 'free'
        setUsage(PLAN_LIMITS[plan] || PLAN_LIMITS.free)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeOrg])

  if (!activeOrg) return <div className="p-8 text-white/40">Select an organization first</div>

  const plan = (activeOrg as any)?.org?.plan || 'free'
  const showUpgrade =
    plan === 'free' &&
    usage &&
    (usage.members.current / usage.members.limit > 0.8 ||
      usage.toolExecs.current / usage.toolExecs.limit > 0.8)

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Usage & Quotas</h1>
          <p className="text-sm text-white/40 mt-1">
            Monitor your organization&apos;s resource usage against plan limits.
          </p>
        </div>
        <span className="text-xs font-medium uppercase tracking-wider px-3 py-1 rounded-full border border-[rgba(0,212,255,0.2)] text-[#00d4ff] bg-[rgba(0,212,255,0.05)]">
          {plan} plan
        </span>
      </div>

      {/* Upgrade banner */}
      {showUpgrade && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-lg border border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.05)]"
        >
          <p className="text-sm text-white/70">
            ⚡ You&apos;re approaching your plan limits.{' '}
            <a
              href="mailto:support@opentool.dev"
              className="text-[#8b5cf6] hover:underline font-medium"
            >
              Upgrade to Pro
            </a>{' '}
            for higher limits and SSO.
          </p>
        </motion.div>
      )}

      {/* Usage bars */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] animate-pulse"
            />
          ))}
        </div>
      ) : (
        usage && (
          <div className="grid gap-3 mb-10">
            <UsageBar label="Members" current={usage.members.current} limit={usage.members.limit} />
            <UsageBar label="API Keys" current={usage.keys.current} limit={usage.keys.limit} />
            <UsageBar
              label="Tool Executions (this hour)"
              current={usage.toolExecs.current}
              limit={usage.toolExecs.limit}
            />
            <UsageBar
              label="API Calls (this hour)"
              current={usage.apiCalls.current}
              limit={usage.apiCalls.limit}
            />
          </div>
        )
      )}

      {/* Plan comparison */}
      {plan === 'free' && (
        <div>
          <h2 className="text-sm font-medium text-white/70 mb-4">Plan comparison</h2>
          <div className="rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  <th className="text-left p-3 text-white/40 font-medium">Feature</th>
                  <th className="text-center p-3 text-white/40 font-medium">Free</th>
                  <th className="text-center p-3 text-[#8b5cf6] font-medium">Pro</th>
                  <th className="text-center p-3 text-[#00d4ff] font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_FEATURES.map((row) => (
                  <tr key={row.feature} className="border-b border-[rgba(255,255,255,0.04)]">
                    <td className="p-3 text-white/60">{row.feature}</td>
                    <td className="p-3 text-center text-white/40">{row.free}</td>
                    <td className="p-3 text-center text-white/60">{row.pro}</td>
                    <td className="p-3 text-center text-white/60">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
