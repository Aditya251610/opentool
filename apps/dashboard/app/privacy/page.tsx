'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

const ease: [number, number, number, number] = [0.23, 1, 0.32, 1]

const sections = [
  { id: 'info-collected', label: 'Information We Collect' },
  { id: 'how-we-use', label: 'How We Use Information' },
  { id: 'data-storage', label: 'Data Storage & Security' },
  { id: 'third-party', label: 'Third-Party Services' },
  { id: 'oauth', label: 'OAuth & Provider Access' },
  { id: 'data-retention', label: 'Data Retention' },
  { id: 'your-rights', label: 'Your Rights' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'children', label: "Children's Privacy" },
  { id: 'changes', label: 'Changes to This Policy' },
  { id: 'contact', label: 'Contact' },
]

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )
    sections.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="max-w-[860px] mx-auto px-6 md:px-10 pt-32 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[rgba(255,255,255,0.25)] mb-4">
            Legal
          </p>
          <h1 className="text-[36px] sm:text-[44px] font-bold tracking-[-0.03em] leading-[1.1] mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-[rgba(255,255,255,0.4)] mb-2">Last updated: April 9, 2025</p>
          <div className="h-px bg-[rgba(255,255,255,0.06)] mt-8 mb-12" />
        </motion.div>

        <div className="flex gap-16">
          {/* Sidebar TOC — desktop only */}
          <aside className="hidden lg:block w-[180px] flex-shrink-0">
            <div className="sticky top-[80px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/20 mb-3">
                On this page
              </p>
              <nav className="flex flex-col gap-1.5">
                {sections.map(({ id, label }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={`text-xs transition-colors ${
                      activeSection === id ? 'text-white' : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease }}
              className="space-y-10"
            >
              <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                OpenTool (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is an open-source MCP
                (Model Context Protocol) server platform. This Privacy Policy explains how we
                collect, use, store, and protect your information when you use the OpenTool hosted
                service at opentool.space, our dashboard, CLI, SDKs, and related services
                (collectively, the &quot;Service&quot;).
              </p>
              <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                If you self-host OpenTool, this policy applies only to any interactions with our
                hosted services (such as package registries or documentation). Your self-hosted
                instance is under your own control and responsibility.
              </p>

              <Section id="info-collected" title="1. Information We Collect">
                <Subsection title="Account Information">
                  When you create an account, we collect your email address and a hashed version of
                  your password. We never store plaintext passwords. Your password is hashed using
                  bcrypt before storage.
                </Subsection>
                <Subsection title="API Keys">
                  We generate and store API keys that authenticate your requests. These keys are
                  associated with your account and can be revoked at any time through the dashboard.
                </Subsection>
                <Subsection title="OAuth Tokens">
                  When you connect third-party services (GitHub, Slack, Notion, etc.), we receive
                  OAuth access tokens and refresh tokens from those providers. These tokens are
                  encrypted at rest using AES-256-GCM before being stored in our database.
                </Subsection>
                <Subsection title="Usage Data">
                  We collect basic usage metrics including tool execution counts, error rates, and
                  response times. This data is used to improve service reliability and is not tied
                  to individual user identities.
                </Subsection>
                <Subsection title="Log Data">
                  Our servers automatically log request metadata including IP addresses, timestamps,
                  user agents, and request paths. Logs are retained for a limited period for
                  debugging and security purposes.
                </Subsection>
              </Section>

              <Section id="how-we-use" title="2. How We Use Your Information">
                <ul className="list-none space-y-3">
                  {[
                    'Authenticate you and authorize access to connected services',
                    'Execute tool calls on your behalf through the MCP protocol',
                    'Maintain and improve the reliability and performance of the Service',
                    'Send important service notifications (security alerts, breaking changes)',
                    'Debug issues and respond to support requests',
                    'Comply with legal obligations',
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]"
                    >
                      <span className="mt-[10px] w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] mt-4">
                  We do not sell, rent, or share your personal information with third parties for
                  marketing purposes. We do not use your data to train AI models.
                </p>
              </Section>

              <Section id="data-storage" title="3. Data Storage & Security">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  We take the security of your data seriously. Our security measures include:
                </p>
                <ul className="list-none space-y-3 mt-4">
                  {[
                    'All OAuth tokens are encrypted at rest using AES-256-GCM with a server-side encryption key',
                    'Passwords are hashed using bcrypt with appropriate salt rounds',
                    'All data in transit is encrypted via TLS/HTTPS',
                    'Database connections use SSL with certificate verification',
                    'Rate limiting is enforced on all authentication endpoints',
                    'API keys can be rotated and revoked at any time',
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]"
                    >
                      <span className="mt-[10px] w-1 h-1 rounded-full bg-[#00d4ff] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] mt-4">
                  Our database is hosted on Neon (PostgreSQL) with automated backups. Redis caching
                  is provided by Upstash with TLS encryption. The application is hosted on Render
                  with automatic SSL.
                </p>
              </Section>

              <Section id="third-party" title="4. Third-Party Services">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  OpenTool integrates with third-party services on your behalf. When you connect a
                  provider, we access only the data and permissions you explicitly authorize through
                  OAuth consent screens. The providers we currently support include:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                  {[
                    'GitHub',
                    'Google (Gmail, Calendar, Drive, Meet)',
                    'Notion',
                    'Slack',
                    'Linear',
                    'Vercel',
                    'Resend',
                  ].map((p) => (
                    <div
                      key={p}
                      className="text-xs text-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2"
                    >
                      {p}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] mt-4">
                  Each provider has its own privacy policy governing how they handle your data. We
                  encourage you to review their policies. We only store the OAuth tokens necessary
                  to execute tool calls — we do not bulk-download or cache your data from these
                  services.
                </p>
              </Section>

              <Section id="oauth" title="5. OAuth & Provider Access">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  When you connect a third-party service, you are redirected to that provider&apos;s
                  authorization page where you grant specific permissions (scopes). OpenTool
                  requests only the minimum scopes necessary for the tools to function. You can
                  disconnect any provider at any time through the dashboard, which will immediately
                  revoke our stored tokens.
                </p>
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] mt-3">
                  We do not access any data beyond what is required to fulfill the specific tool
                  call you initiate. For example, the GitHub &quot;Create Issue&quot; tool only
                  accesses the repository you specify in that request.
                </p>
              </Section>

              <Section id="data-retention" title="6. Data Retention">
                <ul className="list-none space-y-3">
                  {[
                    ['Account data', 'Retained until you delete your account'],
                    [
                      'OAuth tokens',
                      'Retained while the provider is connected; deleted immediately upon disconnection',
                    ],
                    ['API keys', 'Retained until revoked by you or account deletion'],
                    ['Server logs', 'Retained for 30 days, then automatically purged'],
                    [
                      'Usage metrics',
                      'Retained in aggregate form; no personally identifiable information',
                    ],
                  ].map(([label, desc]) => (
                    <li key={label} className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                      <span className="text-white font-medium">{label}:</span> {desc}
                    </li>
                  ))}
                </ul>
              </Section>

              <Section id="your-rights" title="7. Your Rights">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  You have the right to:
                </p>
                <ul className="list-none space-y-3 mt-3">
                  {[
                    'Access the personal information we hold about you',
                    'Request correction of inaccurate data',
                    'Request deletion of your account and all associated data',
                    'Disconnect any third-party provider at any time',
                    'Revoke API keys at any time',
                    'Export your data in a portable format',
                    'Withdraw consent for data processing',
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]"
                    >
                      <span className="mt-[10px] w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] mt-4">
                  To exercise any of these rights, contact us at the email address below or use the
                  relevant features in the dashboard.
                </p>
              </Section>

              <Section id="cookies" title="8. Cookies">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  The OpenTool dashboard uses only essential cookies and local storage for
                  authentication state (API key storage). We do not use tracking cookies, analytics
                  cookies, or any third-party advertising cookies. No cookie consent banner is
                  required as we only use strictly necessary storage.
                </p>
              </Section>

              <Section id="children" title="9. Children's Privacy">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  OpenTool is not intended for use by individuals under the age of 16. We do not
                  knowingly collect personal information from children. If we become aware that we
                  have collected data from a child under 16, we will take steps to delete that
                  information promptly.
                </p>
              </Section>

              <Section id="changes" title="10. Changes to This Policy">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  We may update this Privacy Policy from time to time. Material changes will be
                  communicated through the dashboard or via email. Continued use of the Service
                  after changes constitutes acceptance of the updated policy. The &quot;Last
                  updated&quot; date at the top of this page reflects the most recent revision.
                </p>
              </Section>

              <Section id="contact" title="11. Contact">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  If you have any questions about this Privacy Policy or our data practices, please
                  reach out:
                </p>
                <div className="mt-4 p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                  <p className="text-sm text-white/60">
                    <span className="text-white font-medium">Email:</span>{' '}
                    <a
                      href="mailto:privacy@opentool.space"
                      className="text-[#00d4ff] hover:underline"
                    >
                      privacy@opentool.space
                    </a>
                  </p>
                  <p className="text-sm text-white/60 mt-2">
                    <span className="text-white font-medium">GitHub:</span>{' '}
                    <a
                      href="https://github.com/Aditya251610/opentool/issues"
                      target="_blank"
                      className="text-[#00d4ff] hover:underline"
                    >
                      Open an issue
                    </a>
                  </p>
                </div>
              </Section>

              <div className="h-px bg-[rgba(255,255,255,0.06)] mt-12" />
              <p className="text-xs text-[rgba(255,255,255,0.25)] leading-[1.8] mt-6">
                OpenTool is open-source software released under the MIT License. This privacy policy
                applies to the hosted service at opentool.space. Self-hosted instances are governed
                by the operator&apos;s own policies.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold tracking-[-0.02em] mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-[rgba(255,255,255,0.8)] mb-1.5">{title}</h3>
      <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">{children}</p>
    </div>
  )
}
