import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Box, Text, Static, useApp, useInput } from 'ink'
import Spinner from 'ink-spinner'
import Banner from './Banner.js'
import StatusBar from './StatusBar.js'
import ToolsList from './ToolsList.js'
import Help from './Help.js'
import CommandInput from './CommandInput.js'
import { loadConfig, saveConfig, validateUrl } from '../lib/config.js'
import {
  ApiError,
  endpoints,
  NetworkError,
  unwrapKeys,
  unwrapTools,
  orgEndpoints,
} from '../lib/api.js'
import { appendHistory, loadHistory } from '../lib/history.js'
import { setToolIds, TOP_LEVEL_COMMANDS } from '../lib/completion.js'
import { cacheGet, cacheSet, cacheClear } from '../lib/cache.js'
import { suggest } from '../lib/fuzzy.js'
import { exec } from 'node:child_process'

type View = 'prompt' | 'tools' | 'help' | 'status' | 'config'

interface LogEntry {
  id: number
  text: string
  color: string
}

// Bounded ring-buffer for logs — prevents memory leaks in long sessions
const MAX_LOGS = 200
let logId = 0

function openBrowser(url: string) {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  try {
    exec(`${cmd} ${JSON.stringify(url)}`)
  } catch {
    /* ignore */
  }
}

function fmtError(err: unknown): string {
  if (err instanceof ApiError) return `${err.message}${err.hint ? `\n  hint: ${err.hint}` : ''}`
  if (err instanceof NetworkError) return err.message
  if (err instanceof Error) return err.message
  return String(err)
}

function formatElapsed(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

// Truncate large JSON results in REPL display
function truncateJson(data: unknown, maxLines = 40): string {
  const str = JSON.stringify(data, null, 2)
  const lines = str.split('\n')
  if (lines.length <= maxLines) return str
  return lines.slice(0, maxLines).join('\n') + `\n… ${lines.length - maxLines} more lines`
}

// ─── REPL command handlers ──────────────────────────────────────────────────

type CmdCtx = {
  log: (text: string, color?: string) => void
  runWithSpinner: <T>(
    label: string,
    fn: () => Promise<T>,
  ) => Promise<{ result: T; ms: number } | null>
  setView: (v: View) => void
  exit: () => void
  cmdCount: React.MutableRefObject<number>
}

async function handleLogin(arg: string, ctx: CmdCtx) {
  if (!arg) {
    const cfg = loadConfig()
    const dashUrl = cfg.serverUrl.replace(':3001', ':3000')
    const url = `${dashUrl}/login?cli=true`
    openBrowser(url)
    ctx.log(
      `🔗 Open in browser:\n  ${url}\n\n  After logging in, run:  set-key <your-api-key>`,
      'cyan',
    )
    return
  }
  const parts = arg.split(/\s+/)
  if (parts.length < 2) {
    ctx.log('Usage: login <email> <password>  (or just "login" for browser)', 'yellow')
    return
  }
  const [email, password] = parts
  const res = await ctx.runWithSpinner('Logging in', () => endpoints.login(email, password))
  if (!res) return
  const cfg = loadConfig()
  saveConfig({ ...cfg, apiKey: res.result.apiKey })
  ctx.log(`✓ Logged in as ${res.result.user.email} (${formatElapsed(res.ms)})`, 'green')
}

async function handleConnect(arg: string, ctx: CmdCtx) {
  const provider = arg.toLowerCase()
  if (!provider) return ctx.log('Usage: connect <provider>', 'yellow')
  const res = await ctx.runWithSpinner(`Connecting ${provider}`, () =>
    endpoints.connectUrl(provider),
  )
  if (!res) return
  openBrowser(res.result.url)
  ctx.log(
    `🔗 Authenticate ${provider} — opening browser\n  ${res.result.url}\n\n  After authorizing, run:  tools`,
    'cyan',
  )
}

async function handleDisconnect(arg: string, ctx: CmdCtx) {
  const provider = arg.toLowerCase()
  if (!provider) return ctx.log('Usage: disconnect <provider>', 'yellow')
  const res = await ctx.runWithSpinner(`Disconnecting ${provider}`, () =>
    endpoints.disconnect(provider),
  )
  if (res) ctx.log(`✓ Disconnected ${provider} (${formatElapsed(res.ms)})`, 'green')
}

async function handleExecute(remainder: string, ctx: CmdCtx) {
  const sp = remainder.indexOf(' ')
  const toolId = sp === -1 ? remainder : remainder.slice(0, sp)
  const argsStr = sp === -1 ? '{}' : remainder.slice(sp + 1).trim()
  if (!toolId) return ctx.log('Usage: execute <tool-id> [json-args]', 'yellow')
  let args: Record<string, unknown>
  try {
    args = JSON.parse(argsStr)
  } catch {
    return ctx.log('Invalid JSON. Example: execute github.list_repos {"per_page":5}', 'red')
  }
  const res = await ctx.runWithSpinner(`Executing ${toolId}`, () => endpoints.execute(toolId, args))
  if (!res) return
  const result = (res.result as { result?: unknown }).result ?? res.result
  ctx.log(`✓ Executed ${toolId} (${formatElapsed(res.ms)})\n${truncateJson(result)}`, 'green')
}

async function handleKeys(ctx: CmdCtx) {
  const res = await ctx.runWithSpinner('Loading keys', () => endpoints.keys())
  if (!res) return
  const keys = unwrapKeys(res.result)
  if (keys.length === 0) return ctx.log('No API keys yet', 'gray')
  const lines = keys
    .map((k) => `  ${k.keyPrefix}… — ${k.name} (${k.revokedAt ? 'revoked' : 'active'})`)
    .join('\n')
  ctx.log(`API Keys:\n${lines}`, 'white')
}

async function handleShow(arg: string, ctx: CmdCtx) {
  if (!arg) return ctx.log('Usage: show <tool-id>', 'yellow')
  const cached =
    cacheGet<{ id: string; name: string; provider: string; description?: string }[]>('tools')
  let tools = cached
  if (!tools) {
    const res = await ctx.runWithSpinner('Loading tools', () => endpoints.tools())
    if (!res) return
    tools = unwrapTools(res.result)
    cacheSet('tools', tools)
  }
  const tool = tools.find((t) => t.id === arg)
  if (!tool) {
    const suggestions = suggest(
      arg,
      tools.map((t) => t.id),
    )
    const hint = suggestions.length ? `Did you mean: ${suggestions.join(', ')}?` : ''
    return ctx.log(`Tool not found: ${arg}. ${hint}`, 'yellow')
  }
  ctx.log(
    `${tool.id}\n  name: ${tool.name}\n  provider: ${tool.provider}${tool.description ? `\n  about: ${tool.description}` : ''}`,
    'cyan',
  )
}

// ─── Error boundary wrapper ─────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Text color="red" bold>
            Something went wrong
          </Text>
          <Text color="red">{this.state.error.message}</Text>
          <Text dimColor>{'\n'}Press Ctrl+C to exit.</Text>
        </Box>
      )
    }
    return this.props.children
  }
}

// ─── Main App ───────────────────────────────────────────────────────────────

function AppInner() {
  const { exit } = useApp()
  const [view, setView] = useState<View>('prompt')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const historyRef = useRef<string[]>(loadHistory())
  const [, forceRender] = useState(0)
  const startTime = useRef(Date.now())
  const cmdCount = useRef(0)

  // Ctrl+C / Ctrl+D exits cleanly
  useInput((input, key) => {
    if (key.ctrl && (input === 'c' || input === 'd')) {
      process.stdout.write('\n')
      exit()
    }
  })

  // Prefetch tool IDs for tab completion + cache + update check
  useEffect(() => {
    endpoints
      .tools()
      .then((res) => {
        const all = unwrapTools(res)
        const ids = all.map((t) => t.id)
        setToolIds(ids)
        cacheSet('tools', all)
      })
      .catch(() => {
        /* best-effort */
      })

    // Non-blocking update check (prints to stderr if update available)
    import('../lib/update-check.js')
      .then(({ checkForUpdate }) => {
        checkForUpdate().catch(() => {
          /* silent */
        })
      })
      .catch(() => {
        /* silent */
      })

    return () => {
      process.stdout.write('\n')
    }
  }, [])

  // Handle SIGTERM/SIGINT gracefully
  useEffect(() => {
    const handler = () => {
      process.stdout.write('\n')
      process.exit(0)
    }
    process.on('SIGTERM', handler)
    return () => {
      process.removeListener('SIGTERM', handler)
    }
  }, [])

  const log = useCallback((text: string, color = 'gray') => {
    setLogs((prev) => {
      const next = [...prev, { id: ++logId, text, color }]
      // Ring buffer: keep only last MAX_LOGS entries
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next
    })
  }, [])

  const runWithSpinner = useCallback(
    async <T,>(label: string, fn: () => Promise<T>): Promise<{ result: T; ms: number } | null> => {
      setBusy(label)
      const t0 = Date.now()
      try {
        const result = await fn()
        return { result, ms: Date.now() - t0 }
      } catch (err: unknown) {
        log(`✗ ${fmtError(err)}`, 'red')
        return null
      } finally {
        setBusy(null)
      }
    },
    [log],
  )

  const ctx: CmdCtx = useMemo(
    () => ({ log, runWithSpinner, setView, exit, cmdCount }),
    [log, runWithSpinner, exit],
  )

  const handleSubmit = useCallback(
    async (raw: string) => {
      const cmd = raw.trim()
      if (!cmd) return

      historyRef.current = [...historyRef.current, cmd]
      appendHistory(cmd)
      forceRender((n) => n + 1)
      cmdCount.current++
      log(`❯ ${cmd}`, 'cyan')

      const stripped = cmd.startsWith('/') ? cmd.slice(1) : cmd
      const [verb, ...rest] = stripped.split(/\s+/)
      const arg = rest.join(' ').trim()
      const v = verb.toLowerCase()

      try {
        // View commands (sync, no API call)
        switch (v) {
          case 'help':
          case '?':
            setView('help')
            return
          case 'status':
            setView('status')
            return
          case 'config':
            setView('config')
            return
          case 'tools':
          case 'ls':
            setView('tools')
            return
          case 'clear':
            setView('prompt')
            setLogs([])
            return
          case 'exit':
          case 'quit':
          case 'q':
            exit()
            return
        }

        // Auth commands
        if (v === 'login') return await handleLogin(arg, ctx)
        if (v === 'logout') {
          const cfg = loadConfig()
          if (!cfg.apiKey) {
            log('Not logged in', 'yellow')
            return
          }
          saveConfig({ ...cfg, apiKey: undefined })
          log('✓ Logged out', 'green')
          return
        }

        // Config setters
        if (v === 'set-key') {
          if (!arg) return log('Usage: set-key <api-key>', 'yellow')
          saveConfig({ ...loadConfig(), apiKey: arg })
          log(`✓ API key saved (${arg.slice(0, 11)}…)`, 'green')
          return
        }
        if (v === 'set-url') {
          if (!arg) return log('Usage: set-url <server-url>', 'yellow')
          const urlErr = validateUrl(arg)
          if (urlErr) return log(`✗ ${urlErr}`, 'red')
          saveConfig({ ...loadConfig(), serverUrl: arg.replace(/\/$/, '') })
          log(`✓ Server URL set to ${arg}`, 'green')
          return
        }

        // Tool actions
        if (v === 'connect') return await handleConnect(arg, ctx)
        if (v === 'disconnect') return await handleDisconnect(arg, ctx)
        if (v === 'execute' || v === 'exec' || v === 'run') return await handleExecute(arg, ctx)
        if (v === 'keys') return await handleKeys(ctx)
        if (v === 'show') return await handleShow(arg, ctx)

        // History command
        if (v === 'history') {
          const all = loadHistory()
          const show = all.slice(-20)
          if (show.length === 0) return log('No history yet', 'gray')
          log(
            `History (${all.length} total):\n` +
              show.map((l, i) => `  ${all.length - show.length + i + 1}. ${l}`).join('\n'),
            'white',
          )
          return
        }

        // Refresh tools cache
        if (v === 'refresh') {
          cacheClear()
          const res = await ctx.runWithSpinner('Refreshing', () => endpoints.tools())
          if (res) {
            const all = unwrapTools(res.result)
            setToolIds(all.map((t) => t.id))
            cacheSet('tools', all)
            log(`✓ Refreshed — ${all.length} tools cached (${formatElapsed(res.ms)})`, 'green')
          }
          return
        }

        // Quick health check
        if (v === 'ping') {
          const cfg = loadConfig()
          const t0 = Date.now()
          try {
            const res = await fetch(`${cfg.serverUrl}/health`, {
              signal: AbortSignal.timeout(3000),
            })
            const ms = Date.now() - t0
            if (res.ok) log(`✓ pong — ${ms}ms`, 'green')
            else log(`✗ server returned ${res.status} (${ms}ms)`, 'red')
          } catch {
            log(`✗ server unreachable at ${cfg.serverUrl}`, 'red')
          }
          return
        }

        // Show current user info
        if (v === 'whoami') {
          const cfg = loadConfig()
          if (!cfg.apiKey) {
            log('Not logged in. Run: login', 'yellow')
            return
          }
          log(`Logged in to ${cfg.serverUrl}\n  API key: ${cfg.apiKey.slice(0, 11)}…`, 'cyan')
          return
        }

        // Organization commands
        if (v === 'org') {
          const cfg = loadConfig()
          const sub = rest[0]?.toLowerCase()

          if (!sub || sub === 'list') {
            if (!cfg.apiKey) return log('Not logged in. Run: login', 'yellow')
            const res = await ctx.runWithSpinner('Fetching orgs', () => orgEndpoints.list())
            if (res) {
              const orgs = res.result.orgs
              if (orgs.length === 0) {
                log('No organizations yet. Create with: org create <name> <slug>', 'gray')
              } else {
                const lines = orgs.map(
                  (o: any) =>
                    `  ${cfg.orgSlug === o.slug ? '●' : ' '} ${o.slug} — ${o.name} (${o.role}, ${o.plan})`,
                )
                log(`Organizations:\n${lines.join('\n')}`, cfg.orgSlug ? 'cyan' : 'white')
              }
            }
            return
          }

          if (sub === 'use') {
            const slug = rest[1]
            if (!slug) return log('Usage: org use <slug>', 'yellow')
            saveConfig({ ...cfg, orgSlug: slug })
            log(`✓ Active org set to: ${slug}`, 'green')
            return
          }

          if (sub === 'unset') {
            if (!cfg.orgSlug) return log('No active org to unset', 'yellow')
            saveConfig({ ...cfg, orgSlug: undefined })
            log('✓ Org context cleared', 'green')
            return
          }

          if (sub === 'info') {
            if (!cfg.orgSlug) return log('No active org. Set with: org use <slug>', 'yellow')
            if (!cfg.apiKey) return log('Not logged in. Run: login', 'yellow')
            const res = await ctx.runWithSpinner('Fetching org', () =>
              orgEndpoints.get(cfg.orgSlug!),
            )
            if (res) {
              const { org, role } = res.result
              log(
                `Org: ${org.name} (${org.slug})\n  Plan: ${org.plan}\n  Role: ${role}\n  Members: ${org.memberCount ?? '?'}`,
                'cyan',
              )
            }
            return
          }

          if (sub === 'members') {
            if (!cfg.orgSlug) return log('No active org. Set with: org use <slug>', 'yellow')
            if (!cfg.apiKey) return log('Not logged in. Run: login', 'yellow')
            const res = await ctx.runWithSpinner('Fetching members', () =>
              orgEndpoints.members(cfg.orgSlug!),
            )
            if (res) {
              const lines = res.result.members.map(
                (m: any) => `  ${m.email} — ${m.name || '(no name)'} [${m.role}]`,
              )
              log(`Members of ${cfg.orgSlug}:\n${lines.join('\n')}`, 'white')
            }
            return
          }

          if (sub === 'teams') {
            if (!cfg.orgSlug) return log('No active org. Set with: org use <slug>', 'yellow')
            if (!cfg.apiKey) return log('Not logged in. Run: login', 'yellow')
            const res = await ctx.runWithSpinner('Fetching teams', () =>
              orgEndpoints.teams(cfg.orgSlug!),
            )
            if (res) {
              const lines = res.result.teams.map(
                (t: any) => `  ${t.slug} — ${t.name} (${t.memberCount} members)`,
              )
              log(`Teams in ${cfg.orgSlug}:\n${lines.join('\n')}`, 'white')
            }
            return
          }

          if (sub === 'create') {
            const name = rest[1]
            const slug = rest[2]
            if (!name || !slug) return log('Usage: org create <name> <slug>', 'yellow')
            if (!cfg.apiKey) return log('Not logged in. Run: login', 'yellow')
            const res = await ctx.runWithSpinner('Creating org', () =>
              orgEndpoints.create(name, slug),
            )
            if (res) {
              saveConfig({ ...cfg, orgSlug: slug })
              log(
                `✓ Organization "${name}" created (slug: ${slug})\n  Active org set to: ${slug}`,
                'green',
              )
            }
            return
          }

          log(
            `Unknown org subcommand: "${sub}". Available: list, use, unset, info, members, teams, create`,
            'yellow',
          )
          return
        }

        // Fuzzy "did you mean?" for unknown commands
        const allCmds = TOP_LEVEL_COMMANDS
        const suggestions = suggest(v, allCmds)
        if (suggestions.length > 0) {
          log(`Unknown command: "${cmd}". Did you mean: ${suggestions.join(', ')}?`, 'yellow')
        } else {
          log(`Unknown command: "${cmd}". Type help for the list.`, 'yellow')
        }
      } catch (err: unknown) {
        log(`✗ Unexpected: ${fmtError(err)}`, 'red')
      }
    },
    [exit, log, runWithSpinner, ctx],
  )

  const termRows = process.stdout.rows ?? 24
  const maxLogLines = Math.max(4, Math.min(termRows - 16, 20))

  return (
    <Box flexDirection="column">
      <Static items={['banner']}>{() => <Banner key="banner" />}</Static>

      <StatusBar cmdCount={cmdCount.current} startTime={startTime.current} />

      {view === 'tools' && <ToolsList />}
      {view === 'help' && <Help />}
      {view === 'status' && <StatusView />}
      {view === 'config' && <ConfigView />}

      {logs.length > 0 && (
        <Box flexDirection="column" paddingX={2} marginTop={1}>
          {logs.slice(-maxLogLines).map((l) => (
            <Text key={l.id} color={l.color}>
              {l.text}
            </Text>
          ))}
        </Box>
      )}

      {busy && (
        <Box paddingX={2} marginTop={1}>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text dimColor> {busy}…</Text>
        </Box>
      )}

      <Box paddingX={1} marginTop={1}>
        <CommandInput
          onSubmit={handleSubmit}
          history={historyRef.current}
          placeholder="type a command — try help, tools, login"
        />
      </Box>
    </Box>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  )
}

// ─── Sub-views ──────────────────────────────────────────────────────────────

function StatusView() {
  const [info, setInfo] = useState<{ label: string; color: string }>({
    label: 'Checking…',
    color: 'yellow',
  })
  const config = loadConfig()
  useEffect(() => {
    let mounted = true
    const start = Date.now()
    fetch(`${config.serverUrl}/health`, { signal: AbortSignal.timeout(3000) })
      .then((res) => {
        if (!mounted) return
        const ms = Date.now() - start
        setInfo(
          res.ok
            ? { label: `✓ Server healthy at ${config.serverUrl} (${ms}ms)`, color: 'green' }
            : { label: `✗ Server returned ${res.status} at ${config.serverUrl}`, color: 'red' },
        )
      })
      .catch(() => {
        if (!mounted) return
        setInfo({ label: `✗ Server unreachable at ${config.serverUrl}`, color: 'red' })
      })
    return () => {
      mounted = false
    }
  }, [config.serverUrl])
  return (
    <Box paddingX={2} marginBottom={1}>
      <Text color={info.color}>{info.label}</Text>
    </Box>
  )
}

function ConfigView() {
  const config = loadConfig()
  return (
    <Box flexDirection="column" paddingX={2} marginBottom={1}>
      <Box marginBottom={1}>
        <Text bold color="white">
          Configuration
        </Text>
      </Box>
      <Box gap={1}>
        <Text color="gray">Server URL:</Text>
        <Text color="cyan">{config.serverUrl}</Text>
      </Box>
      <Box gap={1}>
        <Text color="gray">API Key: </Text>
        <Text color={config.apiKey ? 'green' : 'yellow'}>
          {config.apiKey ? `${config.apiKey.slice(0, 11)}…` : 'Not set — run: login'}
        </Text>
      </Box>
      <Box gap={1}>
        <Text color="gray">Config: </Text>
        <Text dimColor>~/.opentool/config.json</Text>
      </Box>
      <Box gap={1}>
        <Text color="gray">History: </Text>
        <Text dimColor>~/.opentool/history</Text>
      </Box>
    </Box>
  )
}
