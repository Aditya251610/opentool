'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

const ease: [number, number, number, number] = [0.23, 1, 0.32, 1]

const sections = [
  { id: 'acceptance', label: 'Acceptance of Terms' },
  { id: 'description', label: 'Service Description' },
  { id: 'accounts', label: 'Accounts & Authentication' },
  { id: 'acceptable-use', label: 'Acceptable Use' },
  { id: 'third-party', label: 'Third-Party Integrations' },
  { id: 'api-usage', label: 'API & Rate Limits' },
  { id: 'intellectual-property', label: 'Intellectual Property' },
  { id: 'self-hosting', label: 'Self-Hosting' },
  { id: 'disclaimers', label: 'Disclaimers' },
  { id: 'limitation', label: 'Limitation of Liability' },
  { id: 'termination', label: 'Termination' },
  { id: 'changes', label: 'Changes to Terms' },
  { id: 'governing-law', label: 'Governing Law' },
  { id: 'contact', label: 'Contact' },
]

export default function TermsPage() {
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
            Terms of Service
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
                These Terms of Service (&quot;Terms&quot;) govern your access to and use of
                OpenTool, including our hosted service, dashboard, CLI tools, SDKs, and APIs
                (collectively, the &quot;Service&quot;). By using the Service, you agree to be bound
                by these Terms.
              </p>

              <Section id="acceptance" title="1. Acceptance of Terms">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  By creating an account, accessing, or using the Service, you agree to these Terms
                  and our{' '}
                  <Link href="/privacy" className="text-[#00d4ff] hover:underline">
                    Privacy Policy
                  </Link>
                  . If you are using the Service on behalf of an organization, you represent that
                  you have the authority to bind that organization to these Terms.
                </p>
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] mt-3">
                  If you do not agree with these Terms, you must not use the Service.
                </p>
              </Section>

              <Section id="description" title="2. Service Description">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  OpenTool is an open-source Model Context Protocol (MCP) server that provides a
                  unified interface for AI agents and applications to interact with third-party
                  services. The Service includes:
                </p>
                <ul className="list-none space-y-3 mt-4">
                  {[
                    'A hosted MCP server with 23+ tools across 10+ providers',
                    'A web dashboard for account management, tool configuration, and OAuth connections',
                    'A command-line interface (CLI) for local development and MCP server management',
                    'TypeScript and Python SDKs for programmatic integration',
                    'REST APIs for authentication, tool management, and execution',
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
              </Section>

              <Section id="accounts" title="3. Accounts & Authentication">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  To use the Service, you must create an account with a valid email address and
                  password. You are responsible for:
                </p>
                <ul className="list-none space-y-3 mt-4">
                  {[
                    'Maintaining the confidentiality of your account credentials and API keys',
                    'All activities that occur under your account',
                    'Notifying us immediately of any unauthorized access or security breach',
                    'Ensuring your contact information is accurate and up to date',
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
                  We reserve the right to suspend or terminate accounts that violate these Terms or
                  compromise the security of the Service.
                </p>
              </Section>

              <Section id="acceptable-use" title="4. Acceptable Use">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  You agree not to use the Service to:
                </p>
                <ul className="list-none space-y-3 mt-4">
                  {[
                    'Violate any applicable laws, regulations, or third-party rights',
                    'Transmit malware, spam, or any harmful or disruptive content',
                    "Attempt to gain unauthorized access to our systems or other users' accounts",
                    'Reverse-engineer, decompile, or attempt to extract the source code of our hosted service (the open-source codebase is freely available)',
                    'Use the Service for any illegal, fraudulent, or abusive purpose',
                    'Circumvent rate limits, authentication mechanisms, or other security measures',
                    'Resell access to the Service without our explicit written consent',
                    'Use the Service in a way that degrades performance for other users',
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]"
                    >
                      <span className="mt-[10px] w-1 h-1 rounded-full bg-[#ef4444] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>

              <Section id="third-party" title="5. Third-Party Integrations">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  The Service allows you to connect third-party services (GitHub, Google, Slack,
                  Notion, Linear, Stripe, Vercel, Resend) through OAuth authorization. By connecting
                  a third-party service:
                </p>
                <ul className="list-none space-y-3 mt-4">
                  {[
                    'You authorize OpenTool to access and interact with that service on your behalf, within the scope of permissions you grant',
                    'You acknowledge that third-party services are governed by their own terms of service and privacy policies',
                    'You understand that OpenTool is not responsible for the availability, accuracy, or security of third-party services',
                    'You may disconnect any provider at any time, which will immediately revoke our access',
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
                  Tool executions interact with live data on your connected accounts. Actions
                  performed through OpenTool (e.g., creating a GitHub issue, sending an email) are
                  real and may not be reversible.
                </p>
              </Section>

              <Section id="api-usage" title="6. API Usage & Rate Limits">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  The Service enforces rate limits to ensure fair usage and platform stability.
                  Current limits include:
                </p>
                <div className="mt-4 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/30">
                          Endpoint
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/30">
                          Limit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Authentication routes', '20 requests / minute / IP'],
                        ['API key management', '20 requests / minute / IP'],
                        ['Tool execution (MCP)', 'Subject to provider rate limits'],
                        ['General API', 'Reasonable use; no hard cap'],
                      ].map(([endpoint, limit]) => (
                        <tr key={endpoint} className="border-b border-[rgba(255,255,255,0.03)]">
                          <td className="px-4 py-3 text-sm text-[rgba(255,255,255,0.55)]">
                            {endpoint}
                          </td>
                          <td className="px-4 py-3 text-sm text-[rgba(255,255,255,0.4)]">
                            {limit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] mt-4">
                  Exceeding rate limits will result in HTTP 429 responses. Persistent abuse may
                  result in temporary or permanent suspension.
                </p>
              </Section>

              <Section id="intellectual-property" title="7. Intellectual Property">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  OpenTool is open-source software released under the{' '}
                  <a
                    href="https://github.com/Aditya251610/opentool/blob/main/LICENSE"
                    target="_blank"
                    className="text-[#00d4ff] hover:underline"
                  >
                    MIT License
                  </a>
                  . You are free to use, modify, and distribute the source code in accordance with
                  that license.
                </p>
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] mt-3">
                  The OpenTool name, logo, and branding are trademarks of the OpenTool project. You
                  may not use these marks in a way that implies endorsement or affiliation without
                  written permission.
                </p>
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] mt-3">
                  You retain all rights to the data you submit through the Service. We claim no
                  ownership over your content, code, or data processed through tool executions.
                </p>
              </Section>

              <Section id="self-hosting" title="8. Self-Hosting">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  OpenTool can be self-hosted under the MIT License. If you choose to self-host:
                </p>
                <ul className="list-none space-y-3 mt-4">
                  {[
                    'You are solely responsible for the security, availability, and compliance of your self-hosted instance',
                    'These Terms of Service apply only to the hosted service at opentool.space, not to self-hosted instances',
                    'We provide no warranty, support, or SLA for self-hosted deployments',
                    'You must comply with the MIT License terms when distributing modified versions',
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
              </Section>

              <Section id="disclaimers" title="9. Disclaimers">
                <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
                  <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                    THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
                    WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
                    WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
                    NON-INFRINGEMENT.
                  </p>
                  <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] mt-3">
                    We do not warrant that the Service will be uninterrupted, error-free, or secure.
                    We do not guarantee the accuracy or completeness of any data returned by tool
                    executions. Third-party service outages are beyond our control.
                  </p>
                </div>
              </Section>

              <Section id="limitation" title="10. Limitation of Liability">
                <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
                  <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, OPENTOOL AND ITS MAINTAINERS SHALL NOT
                    BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
                    DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR BUSINESS
                    OPPORTUNITIES, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
                  </p>
                  <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] mt-3">
                    Our total aggregate liability for any claims arising from the Service shall not
                    exceed the amount you paid us in the twelve (12) months preceding the claim, or
                    $50 USD, whichever is greater.
                  </p>
                </div>
              </Section>

              <Section id="termination" title="11. Termination">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  You may terminate your account at any time by deleting it through the dashboard or
                  contacting us. Upon termination:
                </p>
                <ul className="list-none space-y-3 mt-4">
                  {[
                    'All API keys will be immediately revoked',
                    'All OAuth provider connections will be disconnected and tokens deleted',
                    'Your account data will be permanently deleted within 30 days',
                    'Any cached data will be purged from Redis immediately',
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
                  We reserve the right to suspend or terminate your access if you violate these
                  Terms, abuse the Service, or if required by law. We will provide notice where
                  reasonably possible.
                </p>
              </Section>

              <Section id="changes" title="12. Changes to These Terms">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  We may revise these Terms from time to time. Material changes will be communicated
                  through the dashboard or via email at least 14 days before taking effect.
                  Continued use of the Service after the effective date constitutes acceptance. If
                  you disagree with the changes, you must stop using the Service and delete your
                  account.
                </p>
              </Section>

              <Section id="governing-law" title="13. Governing Law">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  These Terms shall be governed by and construed in accordance with the laws of
                  India, without regard to conflict of law principles. Any disputes arising from
                  these Terms or the Service shall be resolved through good-faith negotiation first,
                  and if necessary, through binding arbitration.
                </p>
              </Section>

              <Section id="contact" title="14. Contact">
                <p className="text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                  For questions or concerns about these Terms, please reach out:
                </p>
                <div className="mt-4 p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                  <p className="text-sm text-white/60">
                    <span className="text-white font-medium">Email:</span>{' '}
                    <a
                      href="mailto:legal@opentool.space"
                      className="text-[#00d4ff] hover:underline"
                    >
                      legal@opentool.space
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
                OpenTool is open-source software released under the MIT License. These terms apply
                to the hosted service at opentool.space. Self-hosted instances are governed by the
                operator&apos;s own terms.
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
