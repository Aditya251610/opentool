'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { GitHubIcon } from '@/components/icons'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

const ease: [number, number, number, number] = [0.23, 1, 0.32, 1]

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'the-story', label: 'The Story' },
  { id: 'self-hosting', label: 'Self-hosting' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'cli', label: 'CLI' },
  { id: 'mcp-setup', label: 'MCP Setup' },
  { id: 'tools', label: 'Tool Reference' },
  { id: 'adding-tools', label: 'Adding Tools' },
  { id: 'contributing', label: 'Contributing' },
  { id: 'changelog', label: 'Changelog' },
]

function Code({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div
      className={`rounded-lg bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] p-4 font-mono text-xs text-white/60 leading-relaxed overflow-x-auto ${className}`}
    >
      <pre>{children}</pre>
    </div>
  )
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="text-[#00d4ff] bg-[rgba(0,212,255,0.08)] px-1.5 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  )
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview')
  const [tocOpen, setTocOpen] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  // Track scroll for back-to-top visibility
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (tocOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [tocOpen])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) setActiveSection(visible.target.id)
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 },
    )

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen text-white">
      <Navbar activePage="/docs" />

      <div className="flex max-w-[1200px] mx-auto pt-[80px]">
        {/* Sidebar TOC */}
        <aside className="hidden lg:block w-[220px] shrink-0 sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto pr-6 pl-6 py-8">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30 mb-4">
            Documentation
          </div>
          <nav className="flex flex-col gap-1">
            {SECTIONS.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className={`text-xs px-2.5 py-1.5 rounded-md transition-all ${
                  activeSection === id
                    ? 'text-white bg-[rgba(0,212,255,0.08)] font-medium shadow-[inset_2px_0_0_#00d4ff]'
                    : 'text-[rgba(255,255,255,0.4)] hover:text-white'
                }`}
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main id="main-content" className="flex-1 min-w-0 px-6 md:px-8 py-8 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            {/* Header */}
            <div className="mb-16">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#00d4ff]">
                Documentation
              </span>
              <h1 className="text-[40px] md:text-[48px] font-bold text-white mt-3 tracking-[-0.02em] leading-[1.1]">
                OpenTool Docs
              </h1>
              <p className="text-lg text-[rgba(255,255,255,0.45)] mt-4 max-w-[560px] leading-relaxed">
                No fluff. No &quot;getting started in 47 easy steps.&quot; Just the stuff you
                actually need to wire your agent to real tools.
              </p>
            </div>

            {/* ═══ OVERVIEW ═══ */}
            <section id="overview" className="mb-20 scroll-mt-24">
              <h2 className="text-[28px] font-bold text-white tracking-[-0.01em]">Overview</h2>
              <div className="mt-4 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>
                  You&apos;re building an agent. It needs to create GitHub issues, send Slack
                  messages, read Notion pages. So now you&apos;re writing OAuth flows, managing
                  token refresh, handling encrypted storage — congratulations, you&apos;re no longer
                  building an agent. You&apos;re maintaining plumbing.
                </p>
                <p>
                  OpenTool kills that entire layer. One MCP server. Every tool your agent needs.
                  Authenticated, encrypted, audited. You write zero auth code.
                </p>
                <p>
                  If you&apos;re writing OAuth code for the third time, something is broken. This
                  fixes it.
                </p>
              </div>

              <div className="mt-8 grid sm:grid-cols-3 gap-3">
                {[
                  {
                    title: 'Self-hosted',
                    desc: 'Your tokens, your server. Nothing leaves your infra. Nothing phones home.',
                  },
                  {
                    title: 'MIT Licensed',
                    desc: "Fork it, gut it, rebuild it, sell it. Zero restrictions. We don't care.",
                  },
                  {
                    title: 'MCP Native',
                    desc: 'Claude Code, Cursor, Windsurf — anything that speaks MCP. One config, done.',
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-xl p-5"
                  >
                    <h3 className="text-sm font-semibold text-white">{card.title}</h3>
                    <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1.5 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ═══ THE STORY ═══ */}
            <section id="the-story" className="mb-20 scroll-mt-24">
              <h2 className="text-[28px] font-bold text-white tracking-[-0.01em]">The Story</h2>
              <div className="mt-4 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>
                  This started the way most side projects do — sitting around, looking for something
                  new to build, something worth learning from.
                </p>
                <p>
                  Found{' '}
                  <Link
                    href="https://arcade.dev"
                    target="_blank"
                    className="text-[#00d4ff] hover:underline"
                  >
                    Arcade.dev
                  </Link>
                  . A tool execution layer for AI agents with managed auth. Dug into it for hours —
                  how it handled OAuth brokering, how tools got registered and discovered, how the
                  execution pipeline worked, how it managed token lifecycle and credential storage.
                  The more I understood it, the more I thought: this is a genuinely good idea, but
                  it&apos;s closed-source, hosted, and not something you can own or inspect.
                </p>
                <p>
                  Spent hours in front of Claude going back and forth — breaking the architecture
                  down, figuring out what each layer actually does vs. what&apos;s just marketing,
                  designing how an open-source version could work. Then sketched the whole system
                  out:
                </p>
              </div>

              {/* Architecture diagram */}
              <div className="mt-8 rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden bg-[#f5f5f5]">
                <Image
                  src="/architecture-origin.png"
                  alt="Original architecture diagram — hand-drawn system design showing User, AI Agent, MCP Runtime, Tool Registry, Auth Broker, Execution Layer, and External Services"
                  width={1088}
                  height={558}
                  className="w-full h-auto"
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 720px"
                />
              </div>
              <p className="mt-3 text-xs text-[rgba(255,255,255,0.25)] italic">
                The original sketch. Hours of research distilled into one diagram. This is what the
                entire project was built from.
              </p>

              <div className="mt-8 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>
                  Then added my own quirks. Encrypted token storage with AES-256-GCM instead of
                  plain-text. A full interactive CLI because I live in the terminal. A dashboard
                  that doesn&apos;t suck. Audit logging on every tool execution. Docker Compose so
                  anyone can self-host in 30 seconds.
                </p>
                <p>
                  The core thesis was simple: this should be open-source. Your agent&apos;s tool
                  access shouldn&apos;t depend on someone else&apos;s uptime, someone else&apos;s
                  pricing page, someone else&apos;s roadmap. If the execution layer is this
                  critical, you should be able to read every line of it.
                </p>
                <p className="text-[rgba(255,255,255,0.35)]">
                  So that&apos;s what this is. Not a startup. Not a pitch deck. Just a tool that
                  exists because someone needed it to exist.
                </p>
              </div>
            </section>

            {/* ═══ SELF-HOSTING ═══ */}
            <section id="self-hosting" className="mb-20 scroll-mt-24">
              <h2 className="text-[28px] font-bold text-white tracking-[-0.01em]">Self-hosting</h2>
              <div className="mt-4 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>
                  Your tokens should not live in some SaaS dashboard you can&apos;t audit. OpenTool
                  runs on your machine. Your tokens stay with you. Everything is inspectable. One
                  command to start.
                </p>
              </div>

              <Code className="mt-6">{`# Clone the repo
git clone https://github.com/Aditya251610/opentool.git
cd opentool

# Copy the env file and fill in your values
cp .env.example .env

# Start everything
docker compose up -d`}</Code>

              <div className="mt-6 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>That spins up four containers. The whole stack:</p>
                <ul className="list-none space-y-2 ml-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#00d4ff] mt-0.5">→</span> PostgreSQL database
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00d4ff] mt-0.5">→</span> Redis for token caching
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00d4ff] mt-0.5">→</span> OpenTool server (port 3001)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00d4ff] mt-0.5">→</span> Dashboard (port 3000)
                  </li>
                </ul>
                <p>
                  Migrations run on first boot. Schema, seed data, everything. You don&apos;t touch
                  SQL. It just works.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-white mt-10">Without Docker</h3>
              <div className="mt-3 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                <p>Don&apos;t like Docker? Fine. Bring your own Postgres and run it bare:</p>
              </div>
              <Code className="mt-4">{`# Install dependencies
pnpm install

# Set up the database
cd apps/server
npx prisma generate && npx prisma db push
npx tsx prisma/seed.ts

# Start the server + dashboard
cd ../..
pnpm dev`}</Code>
            </section>

            {/* ═══ CONFIGURATION ═══ */}
            <section id="configuration" className="mb-20 scroll-mt-24">
              <h2 className="text-[28px] font-bold text-white tracking-[-0.01em]">Configuration</h2>
              <div className="mt-4 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>
                  One <InlineCode>.env</InlineCode> file. That&apos;s the entire config surface. No
                  YAML nesting hell, no scattered config files across four directories, no
                  &quot;check the wiki for advanced options.&quot;
                </p>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8">Required</h3>
              <Code className="mt-4">{`# Database — any PostgreSQL instance
DATABASE_URL="postgresql://user:pass@localhost:5432/opentool"
DIRECT_URL="postgresql://user:pass@localhost:5432/opentool"

# Encryption key for stored tokens (generate with: openssl rand -hex 32)
TOKEN_ENCRYPTION_KEY="your-64-char-hex-key"

# Server URL (used for OAuth callbacks)
SERVER_URL="http://localhost:3001"
DASHBOARD_URL="http://localhost:3000"`}</Code>

              <h3 className="text-xl font-semibold text-white mt-8">OAuth Providers</h3>
              <div className="mt-3 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8]">
                <p>
                  Add credentials for providers you actually use. No credentials = provider
                  doesn&apos;t exist. You don&apos;t configure what you don&apos;t need. Simple.
                </p>
              </div>
              <Code className="mt-4">{`# GitHub
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Notion
NOTION_CLIENT_ID=""
NOTION_CLIENT_SECRET=""

# Slack
SLACK_CLIENT_ID=""
SLACK_CLIENT_SECRET=""

# Google (Gmail + Calendar)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Linear, Stripe, Vercel — same pattern
# Resend and PostgreSQL use API keys (no OAuth needed)`}</Code>
            </section>

            {/* ═══ DASHBOARD ═══ */}
            <section id="dashboard" className="mb-20 scroll-mt-24">
              <h2 className="text-[28px] font-bold text-white tracking-[-0.01em]">Dashboard</h2>
              <div className="mt-4 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>
                  <InlineCode>localhost:3000</InlineCode>. Four pages. No settings buried in
                  settings. No dashboard that needs a dashboard to manage it.
                </p>
                <ul className="list-none space-y-2 ml-2">
                  <li className="flex items-start gap-2">
                    <span className="text-white font-medium">Overview</span>{' '}
                    <span className="text-[rgba(255,255,255,0.35)]">
                      — Stats, MCP config snippet, server health. The stuff you actually check.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white font-medium">Tools</span>{' '}
                    <span className="text-[rgba(255,255,255,0.35)]">
                      — Connect/disconnect providers. One click, OAuth does the rest.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white font-medium">API Keys</span>{' '}
                    <span className="text-[rgba(255,255,255,0.35)]">
                      — Create, copy, revoke. No key rotation ceremony.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white font-medium">Settings</span>{' '}
                    <span className="text-[rgba(255,255,255,0.35)]">
                      — Profile. That&apos;s it. Not 47 tabs.
                    </span>
                  </li>
                </ul>
                <p>
                  Connect a tool from the CLI? Shows up in the dashboard. Connect from the
                  dashboard? Works in the CLI. Same database, same state. Because syncing tools
                  across interfaces shouldn&apos;t be a feature — it should be the default.
                </p>
              </div>
            </section>

            {/* ═══ CLI ═══ */}
            <section id="cli" className="mb-20 scroll-mt-24">
              <h2 className="text-[28px] font-bold text-white tracking-[-0.01em]">CLI</h2>
              <div className="mt-4 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>
                  Not everyone wants to context-switch to a browser to connect a tool. The CLI is a
                  full interactive TUI — login, connect providers, check status, execute tools. All
                  from your terminal. OAuth links are Ctrl+Click-able. You never leave your
                  workflow.
                </p>
              </div>

              <Code className="mt-6">{`# Run the CLI
npx opentool-cli

# Or install globally
npm i -g opentool-cli
opentool

# Or from the monorepo
cd packages/cli && pnpm dev`}</Code>

              <h3 className="text-xl font-semibold text-white mt-8">Commands</h3>
              <div className="mt-4 space-y-3">
                {[
                  { cmd: 'login <email> <pass>', desc: 'Log in and save API key locally' },
                  { cmd: 'login', desc: 'Opens browser for dashboard login' },
                  { cmd: 'set-key <key>', desc: 'Manually set an API key from dashboard' },
                  {
                    cmd: 'connect <provider>',
                    desc: 'Open OAuth flow for a provider (Ctrl+Click the URL)',
                  },
                  { cmd: 'disconnect <provider>', desc: 'Remove a tool connection' },
                  { cmd: 'tools', desc: 'List all providers and connection status' },
                  {
                    cmd: 'execute <tool> {args}',
                    desc: 'Execute a tool (e.g. execute github.list_issues)',
                  },
                  { cmd: 'keys', desc: 'List your API keys' },
                  { cmd: 'status', desc: 'Check server connection health' },
                ].map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-start gap-4">
                    <code className="text-xs font-mono text-[#00d4ff] bg-[rgba(0,212,255,0.06)] px-2 py-1 rounded shrink-0">
                      {cmd}
                    </code>
                    <span className="text-sm text-[rgba(255,255,255,0.45)] pt-0.5">{desc}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ═══ MCP SETUP ═══ */}
            <section id="mcp-setup" className="mb-20 scroll-mt-24">
              <h2 className="text-[28px] font-bold text-white tracking-[-0.01em]">MCP Setup</h2>
              <div className="mt-4 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>
                  This is the part that actually matters. Most people have 5+ MCP servers in their
                  config — scattered, duplicated, half-broken. OpenTool replaces all of them. One
                  entry. Every tool.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8">Claude Desktop</h3>
              <Code className="mt-4">{`{
  "mcpServers": {
    "opentool": {
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer ot_your_api_key_here"
      }
    }
  }
}`}</Code>

              <h3 className="text-xl font-semibold text-white mt-8">Claude Code</h3>
              <Code className="mt-4">{`# Add OpenTool as an MCP server
claude mcp add opentool \\
  --url http://localhost:3001/mcp`}</Code>

              <h3 className="text-xl font-semibold text-white mt-8">Cursor</h3>
              <Code className="mt-4">{`// .cursor/mcp.json
{
  "mcpServers": {
    "opentool": {
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer ot_your_api_key_here"
      }
    }
  }
}`}</Code>

              <div className="mt-6 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>
                  Once configured, your agent sees every connected tool. Connect a new provider in
                  the dashboard or CLI → agent picks it up instantly. No config edit. No restart. No
                  &quot;please reload your MCP servers.&quot;
                </p>
                <p className="text-[rgba(255,255,255,0.35)]">
                  If your MCP setup needs a spreadsheet to track what&apos;s connected where, you
                  don&apos;t have a system. You have chaos.
                </p>
              </div>
            </section>

            {/* ═══ TOOL REFERENCE ═══ */}
            <section id="tools" className="mb-20 scroll-mt-24">
              <h2 className="text-[28px] font-bold text-white tracking-[-0.01em]">
                Tool Reference
              </h2>
              <div className="mt-4 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>
                  26 tools. 10 providers. These aren&apos;t wrappers around wrappers — they&apos;re
                  direct API calls with proper auth. You can read every line of execution code.
                  Nothing is abstracted away into some plugin system you can&apos;t debug.
                </p>
              </div>

              <div className="mt-8 space-y-6">
                {[
                  {
                    provider: 'GitHub',
                    auth: 'OAuth2',
                    tools: [
                      'create_issue',
                      'list_issues',
                      'create_pr',
                      'comment_on_issue',
                      'get_repo',
                    ],
                  },
                  {
                    provider: 'Notion',
                    auth: 'OAuth2',
                    tools: ['create_page', 'query_database', 'update_block'],
                  },
                  { provider: 'Slack', auth: 'OAuth2', tools: ['send_message', 'read_channel'] },
                  { provider: 'Linear', auth: 'OAuth2', tools: ['create_issue', 'update_status'] },
                  {
                    provider: 'Gmail',
                    auth: 'OAuth2',
                    tools: ['send_email', 'read_email', 'search_emails'],
                  },
                  {
                    provider: 'Google Calendar',
                    auth: 'OAuth2',
                    tools: ['create_event', 'list_events'],
                  },
                  {
                    provider: 'Stripe',
                    auth: 'API Key',
                    tools: ['create_payment_link', 'list_customers'],
                  },
                  {
                    provider: 'Vercel',
                    auth: 'OAuth2',
                    tools: ['list_deployments', 'get_deployment'],
                  },
                  { provider: 'Resend', auth: 'API Key', tools: ['send_email'] },
                  {
                    provider: 'PostgreSQL',
                    auth: 'API Key',
                    tools: ['execute_query', 'list_tables', 'describe_table', 'run_transaction'],
                  },
                ].map(({ provider, auth, tools }) => (
                  <div
                    key={provider}
                    className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-xl p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-white">{provider}</h3>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          auth === 'OAuth2'
                            ? 'bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)]'
                            : 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.06)]'
                        }`}
                      >
                        {auth}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tools.map((t) => (
                        <span
                          key={t}
                          className="px-2.5 py-1 rounded-md bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs font-mono text-[rgba(255,255,255,0.5)]"
                        >
                          {provider.toLowerCase().replace(/ /g, '')}.{t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ═══ ADDING TOOLS ═══ */}
            <section id="adding-tools" className="mb-20 scroll-mt-24">
              <h2 className="text-[28px] font-bold text-white tracking-[-0.01em]">Adding Tools</h2>
              <div className="mt-4 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>
                  Most tool frameworks want you to learn their DSL, their config format, their
                  plugin lifecycle. OpenTool doesn&apos;t have any of that. A tool is a single
                  TypeScript file. Zod schema in, execute function out. That&apos;s the entire API.
                </p>
              </div>

              <Code className="mt-6">{`// apps/server/tools/my-tool/index.ts
import { defineTool } from '@opentool/tool-schema'
import { z } from 'zod'

export const myTool = defineTool({
  id: 'mytool.do_thing',
  name: 'Do a thing',
  description: 'Does the thing you need done',
  provider: 'mytool',
  authType: 'oauth2',
  inputSchema: z.object({
    message: z.string().describe('The thing to do'),
  }),
  async execute({ input, auth }) {
    const res = await fetch('https://api.mytool.com/do', {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${auth.accessToken}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: input.message }),
    })
    return res.json()
  },
})`}</Code>

              <div className="mt-6 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>
                  Import it in the registry, run the seed script. Your agent can use it immediately.
                  No build step. No plugin manifest. No restart dance.
                </p>
                <p className="text-[rgba(255,255,255,0.35)]">
                  OAuth provider? Add client ID + secret to the seed script. API key only? Set{' '}
                  <InlineCode>authType: &apos;api_key&apos;</InlineCode>. Done. If adding a tool
                  takes more than 10 minutes, something is wrong with the framework, not you.
                </p>
              </div>
            </section>

            {/* ═══ CONTRIBUTING ═══ */}
            <section id="contributing" className="mb-20 scroll-mt-24">
              <h2 className="text-[28px] font-bold text-white tracking-[-0.01em]">Contributing</h2>
              <div className="mt-4 text-sm text-[rgba(255,255,255,0.55)] leading-[1.8] space-y-4">
                <p>
                  This isn&apos;t a corporation asking for free labor. It&apos;s a tool that exists
                  because someone got tired of rewriting the same integrations. If you&apos;ve felt
                  that pain, you already understand the project.
                </p>
                <p>Highest-impact contributions:</p>
                <ul className="list-none space-y-2 ml-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#00d4ff]">1.</span> Add a new tool provider — see Adding
                    Tools above. Most providers take under an hour.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00d4ff]">2.</span> Fix a bug — check{' '}
                    <Link
                      href="https://github.com/Aditya251610/opentool/issues"
                      target="_blank"
                      className="text-[#00d4ff] hover:underline"
                    >
                      open issues
                    </Link>
                    . Some are one-liners.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00d4ff]">3.</span> Improve these docs — you&apos;re
                    reading them right now. You know what&apos;s confusing.
                  </li>
                </ul>
                <p className="text-[rgba(255,255,255,0.35)]">
                  Half the ecosystem is glue code with branding. If you think a tool should exist,
                  don&apos;t file an issue asking for it. Build it. Open a PR. That&apos;s how this
                  project grows.
                </p>
              </div>
            </section>

            {/* ═══ CHANGELOG ═══ */}
            <section id="changelog" className="mb-20 scroll-mt-24">
              <h2 className="text-[28px] font-bold text-white tracking-[-0.01em]">Changelog</h2>

              <div className="mt-8 relative">
                <div className="absolute left-[3px] top-0 bottom-0 w-px bg-[rgba(255,255,255,0.06)]" />

                {[
                  {
                    version: 'v0.1.1',
                    date: 'Latest',
                    title: 'CLI + SDK on npm, production hardening',
                    changes: [
                      {
                        type: '+',
                        text: 'Published opentool-cli@0.1.1 and @opentool-ts/sdk@0.1.1 to npm',
                      },
                      { type: '+', text: '333 tests across server (283), CLI (32), and SDK (18)' },
                      {
                        type: '+',
                        text: 'CLI: fuzzy search, result caching, debug mode, loading spinners',
                      },
                      { type: '+', text: '0 dependency vulnerabilities (pnpm audit clean)' },
                      { type: '↗', text: 'CI pipeline now runs all package tests' },
                      { type: '↗', text: 'hono upgraded to 4.12.14, vitest to 3.2.4' },
                    ],
                  },
                  {
                    version: 'v0.1.0',
                    date: 'Initial Release',
                    title: 'First public release',
                    changes: [
                      { type: '+', text: 'Core MCP server with Streamable HTTP transport' },
                      { type: '+', text: '10 tool providers (26 tools total)' },
                      { type: '+', text: 'OAuth2 auth broker with AES-256-GCM token encryption' },
                      { type: '+', text: 'Next.js dashboard with auth, tools, keys, settings' },
                      { type: '+', text: 'Interactive Ink-based CLI with login, connect, execute' },
                      {
                        type: '+',
                        text: 'TypeScript SDK with full types and Python SDK with async + Pydantic',
                      },
                      { type: '+', text: 'Docker Compose for self-hosting' },
                      { type: '+', text: 'Full audit logging on every tool execution' },
                      { type: '+', text: 'Prisma schema with 7 models, 13 indexes' },
                    ],
                  },
                ].map((entry) => (
                  <div key={entry.version} className="relative pl-8 pb-8">
                    <div className="absolute left-0 top-[6px] w-[7px] h-[7px] rounded-full bg-[#00d4ff]" />
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] font-mono">
                        {entry.version}
                      </span>
                      <span className="text-xs text-white/30">{entry.date}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{entry.title}</h3>
                    <div className="mt-3 space-y-1.5">
                      {entry.changes.map((change, i) => (
                        <div key={i} className="text-sm leading-relaxed flex items-start gap-2">
                          <span
                            className={`mt-0.5 font-mono ${
                              change.type === '+'
                                ? 'text-[#22c55e]'
                                : change.type === '↗'
                                  ? 'text-[#00d4ff]'
                                  : 'text-[#f59e0b]'
                            }`}
                          >
                            {change.type}
                          </span>
                          <span className="text-[rgba(255,255,255,0.55)]">{change.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom CTA */}
            <div className="mt-8 pt-12 border-t border-[rgba(255,255,255,0.06)] text-center">
              <p className="text-base text-[rgba(255,255,255,0.45)]">
                This is not a demo project. This is the layer agents should have had from the start.
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <Link
                  href="/signup"
                  className="h-10 px-5 rounded-lg bg-[#00d4ff] text-black text-sm font-medium flex items-center hover:bg-[#38e0ff] transition-colors"
                >
                  Get Started →
                </Link>
                <Link
                  href="https://github.com/Aditya251610/opentool"
                  target="_blank"
                  className="h-10 px-5 rounded-lg border border-[rgba(255,255,255,0.12)] text-white/60 text-sm flex items-center gap-2 hover:text-white hover:border-[rgba(255,255,255,0.25)] transition-all"
                >
                  <GitHubIcon size={14} /> Source on GitHub
                </Link>
              </div>
            </div>
          </motion.div>
        </main>
      </div>

      {/* ─── Mobile TOC Drawer (lg:hidden) ─── */}
      <AnimatePresence>
        {tocOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
              onClick={() => setTocOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-[81] rounded-t-2xl border-t border-white/[0.08] bg-[#0f0f0f] max-h-[70vh] overflow-hidden"
            >
              {/* Handle */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-white/[0.15]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 border-b border-white/[0.06]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">
                  On this page
                </span>
                <button
                  onClick={() => setTocOpen(false)}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded-md hover:bg-white/[0.04]"
                >
                  Done
                </button>
              </div>

              {/* Section links */}
              <nav className="overflow-y-auto max-h-[calc(70vh-80px)] py-2 px-3">
                {SECTIONS.map(({ id, label }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={() => setTocOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors min-h-[44px] ${
                      activeSection === id
                        ? 'bg-[rgba(0,212,255,0.08)] text-white'
                        : 'text-white/45 active:bg-white/[0.04]'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        activeSection === id ? 'bg-brand' : 'bg-white/[0.1]'
                      }`}
                    />
                    <span className="text-sm">{label}</span>
                  </a>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Floating buttons ─── */}
      {/* Back to top — all screen sizes */}
      <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={scrollToTop}
              className="w-11 h-11 rounded-full bg-white/[0.06] border border-white/[0.1] backdrop-blur-sm flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.1] transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
              aria-label="Back to top"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 13V3m0 0L3 8m5-5l5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* TOC trigger — mobile/tablet only */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => setTocOpen(true)}
          className="lg:hidden h-11 px-4 rounded-full bg-brand text-black text-xs font-medium flex items-center gap-2 shadow-[0_4px_24px_rgba(0,212,255,0.25)] hover:shadow-[0_6px_32px_rgba(0,212,255,0.35)] active:scale-95 transition-all"
          aria-label="Open table of contents"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 4h12M2 8h8M2 12h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Contents
        </motion.button>
      </div>

      <Footer />
    </div>
  )
}
