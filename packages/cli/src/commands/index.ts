import {
  c,
  emitErr,
  emitInfo,
  emitJson,
  emitOk,
  emitWarn,
  formatMs,
  formatToolId,
  hr,
  sectionHeader,
  sym,
  table,
  truncateResult,
} from '../lib/format.js'
import {
  ApiError,
  type Connection,
  endpoints,
  EXIT,
  exitCodeFor,
  NetworkError,
  unwrapConnections,
  unwrapKeys,
  unwrapTools,
} from '../lib/api.js'
import { loadConfig, saveConfig, validateUrl, configDir } from '../lib/config.js'
import { withSpinner } from '../lib/spinner.js'
import { loadHistory, searchHistory, compactHistory } from '../lib/history.js'
import { KNOWN_PROVIDERS } from '../lib/completion.js'
import { suggest } from '../lib/fuzzy.js'
import { exec } from 'node:child_process'
import { createInterface } from 'node:readline'

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  try {
    exec(`${cmd} ${JSON.stringify(url)}`)
  } catch {
    emitWarn('Could not open browser automatically.')
  }
}

function prompt(question: string, opts: { silent?: boolean } = {}): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (opts.silent) {
      const stdin = process.stdin
      const wasRaw = stdin.isRaw ?? false
      process.stdout.write(question)
      let buf = ''
      stdin.setRawMode?.(true)
      stdin.resume()
      stdin.setEncoding('utf8')
      const onData = (ch: string) => {
        if (ch === '\n' || ch === '\r' || ch === '\u0004') {
          stdin.setRawMode?.(wasRaw)
          stdin.pause()
          stdin.removeListener('data', onData)
          process.stdout.write('\n')
          rl.close()
          resolve(buf)
        } else if (ch === '\u0003') {
          process.exit(130)
        } else if (ch === '\u007f' || ch === '\b') {
          buf = buf.slice(0, -1)
        } else {
          buf += ch
        }
      }
      stdin.on('data', onData)
    } else {
      rl.question(question, (answer) => {
        rl.close()
        resolve(answer)
      })
    }
  })
}

/** Read stdin if piped (non-interactive). */
async function readStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null
  const chunks: string[] = []
  process.stdin.setEncoding('utf-8')
  for await (const chunk of process.stdin) {
    chunks.push(chunk as string)
  }
  const result = chunks.join('').trim()
  return result || null
}

function handleApiError(err: unknown): never {
  if (err instanceof ApiError) {
    emitErr(err.message, err.hint)
  } else if (err instanceof NetworkError) {
    emitErr(err.message)
  } else if (err instanceof Error) {
    emitErr(err.message)
  } else {
    emitErr(String(err))
  }
  process.exit(exitCodeFor(err))
}

// ─── login ────────────────────────────────────────────────────────────────

export async function loginCmd(opts: { email?: string; password?: string; browser?: boolean }) {
  const config = loadConfig()

  if (opts.browser || (!opts.email && !opts.password && !process.stdin.isTTY)) {
    const dashUrl = config.serverUrl.replace(':3001', ':3000')
    const url = `${dashUrl}/login?cli=true`
    openBrowser(url)
    emitInfo(`Opening ${c.cyan(url)} in your browser`)
    process.stdout.write(
      `\n  After logging in, copy your API key from the dashboard, then run:\n  ${c.cyan('opentool set-key <your-api-key>')}\n\n`,
    )
    return
  }

  const email = opts.email ?? (await prompt(`${sym.arrow} Email: `))
  const password = opts.password ?? (await prompt(`${sym.arrow} Password: `, { silent: true }))

  try {
    const { result, elapsedMs } = await withSpinner('Logging in', () =>
      endpoints.login(email, password),
    )
    saveConfig({ ...config, apiKey: result.apiKey })
    emitOk(`Logged in as ${c.cyan(result.user.email)} ${formatMs(elapsedMs)}`)
    emitInfo(`API key saved to ${c.gray('~/.opentool/config.json')}`)
  } catch (err) {
    handleApiError(err)
  }
}

export function logoutCmd() {
  const config = loadConfig()
  if (!config.apiKey) {
    emitWarn('Not logged in')
    return
  }
  saveConfig({ ...config, apiKey: undefined })
  emitOk('Logged out')
}

// ─── tools ────────────────────────────────────────────────────────────────

export async function toolsCmd(
  opts: { query?: string; json?: boolean; provider?: string; limit?: number } = {},
) {
  try {
    const { result: data, elapsedMs } = await withSpinner('Loading tools', async () => {
      const [toolsRes, connRes] = await Promise.all([
        endpoints.tools(),
        loadConfig().apiKey
          ? endpoints.connections().catch((): Connection[] => [])
          : Promise.resolve([] as Connection[]),
      ])
      const tools = unwrapTools(toolsRes)
      const connList = Array.isArray(connRes) ? connRes : unwrapConnections(connRes)
      return { tools, connList }
    })

    let tools = data.tools
    const connected = new Set(data.connList.map((cn) => cn.provider))

    if (opts.provider) tools = tools.filter((t) => t.provider === opts.provider)
    if (opts.query) {
      const q = opts.query.toLowerCase()
      tools = tools.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q),
      )
    }
    if (opts.limit && opts.limit > 0) tools = tools.slice(0, opts.limit)

    if (opts.json) {
      emitJson(tools.map((t) => ({ ...t, connected: connected.has(t.provider) })))
      return
    }

    if (tools.length === 0) {
      emitWarn('No tools match your filter')
      return
    }

    process.stdout.write(
      sectionHeader(
        'Tools',
        `${tools.length} total · ${connected.size} provider${connected.size === 1 ? '' : 's'} connected ${formatMs(elapsedMs)}`,
      ),
    )
    process.stdout.write(
      table(tools, [
        {
          header: 'status',
          get: (t) => (connected.has(t.provider) ? '●' : '○'),
          color: (s) => (s === '●' ? c.green(s) : c.gray(s)),
        },
        { header: 'id', get: (t) => t.id, color: (_, t) => formatToolId(t.id) },
        { header: 'name', get: (t) => t.name, color: (s) => c.white(s) },
      ]) + '\n\n',
    )

    if (!loadConfig().apiKey) {
      emitWarn('Not logged in — connection status hidden. Run "opentool login".')
    }
  } catch (err) {
    handleApiError(err)
  }
}

// ─── show-tool ────────────────────────────────────────────────────────────

export async function showToolCmd(id: string, opts: { json?: boolean } = {}) {
  try {
    const { result: tools } = await withSpinner('Loading tool', async () =>
      unwrapTools(await endpoints.tools()),
    )
    const tool = tools.find((t) => t.id === id)
    if (!tool) {
      const ids = tools.map((t) => t.id)
      const suggestions = suggest(id, ids)
      const hint = suggestions.length
        ? `Did you mean: ${suggestions.map((s) => c.cyan(s)).join(', ')}?`
        : 'Run "opentool tools" to list available tools.'
      emitErr(`Tool not found: ${id}`, hint)
      process.exit(EXIT.NOT_FOUND)
    }
    if (opts.json) return emitJson(tool)

    // Render tool card
    const toolAny = tool as unknown as Record<string, unknown>
    process.stdout.write(
      `\n  ${c.bold(formatToolId(tool.id))}\n` +
        `  ${c.gray('name:')}       ${c.white(tool.name)}\n` +
        `  ${c.gray('provider:')}   ${c.cyan(tool.provider)}\n` +
        (tool.description ? `  ${c.gray('about:')}      ${tool.description}\n` : ''),
    )

    // Show parameters if available (input_schema / parameters)
    const schema = toolAny.inputSchema ?? toolAny.input_schema ?? toolAny.parameters
    if (schema && typeof schema === 'object') {
      const schemaObj = schema as Record<string, unknown>
      const props = (schemaObj.properties ?? {}) as Record<string, Record<string, unknown>>
      const required = (schemaObj.required ?? []) as string[]
      const paramNames = Object.keys(props)
      if (paramNames.length > 0) {
        process.stdout.write(`\n  ${c.bold('Parameters:')}\n`)
        for (const name of paramNames) {
          const prop = props[name]
          const type = typeof prop.type === 'string' ? prop.type : 'any'
          const req = required.includes(name)
          const desc = typeof prop.description === 'string' ? prop.description : ''
          process.stdout.write(
            `    ${c.cyan(name)} ${c.gray(`<${type}>`)}${req ? c.red(' *') : ''}` +
              (desc ? `  ${c.gray(desc)}` : '') +
              '\n',
          )
        }
        if (required.length > 0) {
          process.stdout.write(`\n  ${c.gray('* = required')}\n`)
        }
      }
    }

    // Show example execution
    process.stdout.write(
      `\n  ${c.gray('Execute:')} ${c.cyan(`opentool exec ${tool.id} --args '{}'`)}\n\n`,
    )
  } catch (err) {
    handleApiError(err)
  }
}

// ─── connect / disconnect ─────────────────────────────────────────────────

export async function connectCmd(provider: string) {
  const p = provider.toLowerCase()
  if (!KNOWN_PROVIDERS.includes(p)) {
    const suggestions = suggest(p, KNOWN_PROVIDERS)
    if (suggestions.length) {
      emitWarn(`Unknown provider "${p}". Did you mean: ${suggestions.join(', ')}?`)
    }
  }
  try {
    const { result: data, elapsedMs } = await withSpinner(`Connecting ${p}`, () =>
      endpoints.connectUrl(p),
    )
    openBrowser(data.url)
    emitInfo(`Authenticate ${c.cyan(p)} — opening browser ${formatMs(elapsedMs)}`)
    process.stdout.write(`\n  ${c.gray("If it doesn't open, visit:")} ${c.cyan(data.url)}\n\n`)
    process.stdout.write(
      `  ${c.dim('After authorizing, run')} ${c.cyan('opentool tools')}${c.dim(' to verify.')}\n\n`,
    )
  } catch (err) {
    handleApiError(err)
  }
}

export async function disconnectCmd(provider: string, opts: { yes?: boolean } = {}) {
  const p = provider.toLowerCase()
  if (!opts.yes && process.stdin.isTTY) {
    const answer = await prompt(
      `${sym.warn} Disconnect ${c.cyan(p)}? This revokes access. ${c.dim('[y/N]')} `,
    )
    if (answer.toLowerCase() !== 'y') {
      emitInfo('Cancelled')
      return
    }
  }
  try {
    const { elapsedMs } = await withSpinner(`Disconnecting ${p}`, () => endpoints.disconnect(p))
    emitOk(`Disconnected ${c.cyan(p)} ${formatMs(elapsedMs)}`)
  } catch (err) {
    handleApiError(err)
  }
}

// ─── execute ──────────────────────────────────────────────────────────────

export async function executeCmd(
  toolId: string,
  opts: { args?: string; json?: boolean; timeout?: number } = {},
) {
  let args: Record<string, unknown> = {}

  // Support stdin piping: echo '{"key":"val"}' | opentool exec tool.id
  const stdinData = opts.args ? null : await readStdin()
  const rawArgs = opts.args ?? stdinData

  if (rawArgs) {
    try {
      args = JSON.parse(rawArgs)
    } catch {
      emitErr(
        'Invalid JSON in --args',
        'Example: opentool exec github.list_repos --args \'{"per_page":5}\'',
      )
      process.exit(EXIT.GENERAL)
    }
  }

  try {
    const timeoutMs = opts.timeout ?? 60_000
    const { result: data, elapsedMs } = await withSpinner(`Executing ${c.cyan(toolId)}`, () =>
      endpoints.execute(toolId, args),
    )
    const result = (data as { result?: unknown }).result ?? data

    if (opts.json) return emitJson(result)

    emitOk(`Executed ${formatToolId(toolId)} ${formatMs(elapsedMs)}`)
    process.stdout.write(c.gray(hr()) + '\n')

    // Pretty-print result based on type
    if (typeof result === 'string') {
      process.stdout.write(result + '\n')
    } else if (Array.isArray(result) && result.length === 0) {
      process.stdout.write(c.gray('(empty result)') + '\n')
    } else {
      process.stdout.write(truncateResult(result) + '\n')
    }
  } catch (err) {
    handleApiError(err)
  }
}

// ─── keys ─────────────────────────────────────────────────────────────────

export async function keysCmd(opts: { json?: boolean } = {}) {
  try {
    const { result: keys, elapsedMs } = await withSpinner('Loading keys', async () =>
      unwrapKeys(await endpoints.keys()),
    )
    if (opts.json) return emitJson(keys)
    if (keys.length === 0) {
      emitInfo('No API keys yet')
      return
    }
    process.stdout.write(sectionHeader('API Keys', formatMs(elapsedMs)))
    process.stdout.write(
      table(keys, [
        {
          header: 'status',
          get: (k) => (k.revokedAt ? 'revoked' : 'active'),
          color: (s) => (s === 'active' ? c.green(s) : c.red(s)),
        },
        { header: 'prefix', get: (k) => `${k.keyPrefix}…`, color: (s) => c.cyan(s) },
        { header: 'name', get: (k) => k.name, color: (s) => c.white(s) },
      ]) + '\n\n',
    )
  } catch (err) {
    handleApiError(err)
  }
}

// ─── status / config / set-* ──────────────────────────────────────────────

export async function statusCmd(opts: { json?: boolean } = {}) {
  const config = loadConfig()
  const version = (await import('../lib/version.js')).getVersion()
  const start = Date.now()
  let healthy = false
  let serverVersion: string | undefined
  let toolCount: number | undefined
  try {
    const res = await fetch(`${config.serverUrl}/health`, { signal: AbortSignal.timeout(3000) })
    healthy = res.ok
    try {
      const body = await res.json()
      serverVersion = (body as { version?: string }).version
    } catch {
      /* no version in health response */
    }
  } catch {
    healthy = false
  }
  const latency = Date.now() - start

  // Try to get tool count if authenticated
  if (healthy && config.apiKey) {
    try {
      const toolRes = await fetch(`${config.serverUrl}/api/tools`, {
        signal: AbortSignal.timeout(3000),
      })
      if (toolRes.ok) {
        const toolBody = await toolRes.json()
        const tools = Array.isArray(toolBody)
          ? toolBody
          : ((toolBody as { tools?: unknown[] }).tools ?? [])
        toolCount = tools.length
      }
    } catch {
      /* best-effort */
    }
  }

  if (opts.json) {
    return emitJson({
      serverUrl: config.serverUrl,
      healthy,
      latencyMs: latency,
      authenticated: !!config.apiKey,
      cliVersion: version,
      serverVersion,
      toolCount,
    })
  }
  process.stdout.write(
    `\n  ${c.gray('server:')}   ${c.cyan(config.serverUrl)}\n` +
      `  ${c.gray('health:')}   ${
        healthy
          ? `${sym.ok} ${c.green('reachable')} ${formatMs(latency)}`
          : `${sym.err} ${c.red('unreachable')}`
      }\n` +
      `  ${c.gray('auth:')}     ${
        config.apiKey
          ? `${sym.ok} ${c.green('logged in')}`
          : `${sym.warn} ${c.yellow('not logged in')}`
      }\n` +
      `  ${c.gray('cli:')}      v${version}\n` +
      (serverVersion ? `  ${c.gray('server:')}   v${serverVersion}\n` : '') +
      (toolCount !== undefined ? `  ${c.gray('tools:')}    ${toolCount} available\n` : '') +
      '\n',
  )
}

export function configCmd(opts: { json?: boolean } = {}) {
  const config = loadConfig()
  if (opts.json) return emitJson(config)
  process.stdout.write(
    `\n  ${c.gray('serverUrl:')} ${c.cyan(config.serverUrl)}\n` +
      `  ${c.gray('apiKey:')}    ${
        config.apiKey ? c.green(`${config.apiKey.slice(0, 11)}…`) : c.yellow('(not set)')
      }\n` +
      `  ${c.gray('config:')}    ${c.gray(configDir() + '/config.json')}\n` +
      `  ${c.gray('history:')}   ${c.gray(configDir() + '/history')}\n\n`,
  )
}

export function setKeyCmd(key: string) {
  if (!key) {
    emitErr('Missing API key', 'Usage: opentool set-key <api-key>')
    process.exit(EXIT.GENERAL)
  }
  const config = loadConfig()
  saveConfig({ ...config, apiKey: key })
  emitOk(`API key saved (${key.slice(0, 11)}…)`)
}

export function setUrlCmd(url: string) {
  if (!url) {
    emitErr('Missing URL', 'Usage: opentool set-url <server-url>')
    process.exit(EXIT.GENERAL)
  }
  const err = validateUrl(url)
  if (err) {
    emitErr(err, 'Example: opentool set-url https://opentool.onrender.com')
    process.exit(EXIT.GENERAL)
  }
  const config = loadConfig()
  saveConfig({ ...config, serverUrl: url.replace(/\/$/, '') })
  emitOk(`Server URL set to ${c.cyan(url)}`)
}

// ─── history ──────────────────────────────────────────────────────────────

export function historyCmd(opts: { lines?: number; search?: string } = {}) {
  if (opts.search) {
    const results = searchHistory(opts.search)
    if (results.length === 0) {
      emitInfo(`No history matching "${opts.search}"`)
      return
    }
    const show = results.slice(0, opts.lines ?? 20)
    process.stdout.write(
      sectionHeader('History', `${results.length} matches for "${opts.search}"`) +
        show.map((line) => `  ${c.gray(sym.bullet)} ${line}`).join('\n') +
        '\n\n',
    )
    return
  }

  const all = loadHistory()
  if (all.length === 0) {
    emitInfo('No history yet')
    return
  }
  const show = all.slice(-(opts.lines ?? 20))
  process.stdout.write(
    sectionHeader('History', `${all.length} total`) +
      show
        .map(
          (line, i) => `  ${c.gray(String(all.length - show.length + i + 1).padStart(3))} ${line}`,
        )
        .join('\n') +
      '\n\n',
  )
}

// ─── doctor ───────────────────────────────────────────────────────────────

export async function doctorCmd() {
  process.stdout.write(sectionHeader('OpenTool Doctor', 'checking your setup'))
  const config = loadConfig()
  const checks: { label: string; ok: boolean; detail: string }[] = []

  // 1. Config file
  const { existsSync, statSync } = await import('node:fs')
  const cfgExists = existsSync(configDir() + '/config.json')
  checks.push({
    label: 'Config file',
    ok: cfgExists,
    detail: cfgExists ? configDir() + '/config.json' : 'Not found — run "opentool init"',
  })

  // 2. Server URL format
  const urlErr = validateUrl(config.serverUrl)
  checks.push({
    label: 'Server URL',
    ok: !urlErr,
    detail: urlErr ?? config.serverUrl,
  })

  // 3. Server reachable + latency
  let healthy = false
  let serverVersion: string | undefined
  const start = Date.now()
  try {
    const res = await fetch(`${config.serverUrl}/health`, { signal: AbortSignal.timeout(5000) })
    healthy = res.ok
    try {
      const body = await res.json()
      serverVersion = (body as { version?: string }).version
    } catch {
      /* no version */
    }
  } catch {
    /* not reachable */
  }
  const ms = Date.now() - start
  checks.push({
    label: 'Server reachable',
    ok: healthy,
    detail: healthy
      ? `Yes ${formatMs(ms)}${serverVersion ? ` · server v${serverVersion}` : ''}`
      : `No — is the server running at ${config.serverUrl}?`,
  })

  // 4. Authentication
  checks.push({
    label: 'Authenticated',
    ok: !!config.apiKey,
    detail: config.apiKey
      ? `Key: ${config.apiKey.slice(0, 11)}…`
      : 'No API key — run "opentool login"',
  })

  // 5. API key validity (only if server reachable + key exists)
  if (healthy && config.apiKey) {
    let keyValid = false
    try {
      const res = await fetch(`${config.serverUrl}/api/keys`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        signal: AbortSignal.timeout(3000),
      })
      keyValid = res.ok
    } catch {
      /* check failed */
    }
    checks.push({
      label: 'API key valid',
      ok: keyValid,
      detail: keyValid
        ? 'Key accepted by server'
        : 'Key rejected — may be revoked. Run "opentool login"',
    })
  }

  // 6. Node.js version
  const nodeVer = process.version
  const major = parseInt(nodeVer.slice(1), 10)
  checks.push({
    label: 'Node.js',
    ok: major >= 18,
    detail: `${nodeVer}${major < 18 ? ' — requires Node 18+' : major >= 20 ? ' ✓ (recommended)' : ''}`,
  })

  // 7. Terminal capabilities
  const isTTY = process.stdout.isTTY
  const termCols = process.stdout.columns ?? 0
  checks.push({
    label: 'Terminal',
    ok: !!isTTY,
    detail: isTTY
      ? `TTY ${termCols}×${process.stdout.rows ?? '?'} · colors: ${process.env.NO_COLOR ? 'disabled' : 'enabled'}`
      : 'Non-interactive (piped) — REPL may not work',
  })

  // 8. Config directory writable
  let cfgWritable = false
  try {
    const dir = configDir()
    if (existsSync(dir)) {
      const stats = statSync(dir)
      cfgWritable = !!(stats.mode & 0o200)
    } else {
      // Parent dir writable?
      const { dirname } = await import('node:path')
      const parent = dirname(dir)
      cfgWritable = existsSync(parent)
    }
  } catch {
    /* not writable */
  }
  checks.push({
    label: 'Config writable',
    ok: cfgWritable,
    detail: cfgWritable ? configDir() : 'Cannot write to config directory',
  })

  // 9. Connected tools (if authenticated + server reachable)
  if (healthy && config.apiKey) {
    try {
      const res = await fetch(`${config.serverUrl}/api/tools/connected`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const body = (await res.json()) as { connections?: unknown[] } | unknown[]
        const connections = Array.isArray(body)
          ? body
          : ((body as { connections?: unknown[] }).connections ?? [])
        checks.push({
          label: 'Connected providers',
          ok: connections.length > 0,
          detail:
            connections.length > 0
              ? `${connections.length} provider${connections.length === 1 ? '' : 's'} connected`
              : 'No providers connected — run "opentool connect <provider>"',
        })
      }
    } catch {
      /* skip */
    }
  }

  // Print results
  process.stdout.write('\n')
  for (const check of checks) {
    const icon = check.ok ? sym.ok : sym.err
    process.stdout.write(
      `  ${icon} ${c.bold(check.label)}: ${check.ok ? c.green(check.detail) : c.red(check.detail)}\n`,
    )
  }

  const passed = checks.filter((ch) => ch.ok).length
  const total = checks.length
  const allGood = passed === total

  process.stdout.write(
    `\n  ${
      allGood
        ? c.green(`All ${total} checks passed! ✨`)
        : c.yellow(`${passed}/${total} checks passed`)
    }\n`,
  )

  if (!allGood) {
    const failedLabels = checks.filter((ch) => !ch.ok).map((ch) => ch.label)
    process.stdout.write(`\n  ${c.gray('Failed:')} ${failedLabels.join(', ')}\n`)
    process.stdout.write(
      `  ${c.gray('Run')} ${c.cyan('opentool init')} ${c.gray('to fix common issues')}\n\n`,
    )
    process.exit(EXIT.GENERAL)
  }
  process.stdout.write('\n')
}

// ─── init wizard ──────────────────────────────────────────────────────────

export async function initCmd() {
  const version = (await import('../lib/version.js')).getVersion()
  const { pickTagline } = await import('../lib/tagline.js')
  process.stdout.write(
    `\n${c.bold(c.cyan('⚡ OpenTool setup'))} ${c.gray(`v${version}`)}\n` +
      `${c.gray(pickTagline())}\n` +
      `${c.gray('─'.repeat(50))}\n\n`,
  )
  const config = loadConfig()

  const answer = (
    await prompt(`${sym.arrow} Server URL ${c.gray(`[${config.serverUrl}]`)}: `)
  ).trim()
  const finalUrl = (answer || config.serverUrl).replace(/\/$/, '')

  const urlErr = validateUrl(finalUrl)
  if (urlErr) {
    emitWarn(urlErr)
  }

  process.stdout.write(`\n${sym.info} Checking ${c.cyan(finalUrl)}…\n`)
  let ok = false
  let serverVersion: string | undefined
  try {
    const res = await fetch(`${finalUrl}/health`, { signal: AbortSignal.timeout(3000) })
    ok = res.ok
    try {
      const body = await res.json()
      serverVersion = (body as { version?: string }).version
    } catch {
      /* no version */
    }
  } catch {
    /* keep ok = false */
  }
  if (ok) {
    emitOk(`Server reachable${serverVersion ? ` (v${serverVersion})` : ''}`)
  } else {
    emitWarn('Server unreachable — saved anyway. Start it with: docker compose up')
  }

  saveConfig({ ...config, serverUrl: finalUrl })
  compactHistory()

  process.stdout.write(
    `\n${c.bold(c.cyan('Next steps:'))}\n` +
      `  ${c.cyan('1.')} Log in with ${c.cyan('opentool login')}\n` +
      `  ${c.cyan('2.')} Connect a provider: ${c.cyan('opentool connect github')}\n` +
      `  ${c.cyan('3.')} List your tools: ${c.cyan('opentool tools')}\n` +
      `  ${c.cyan('4.')} Start the REPL: ${c.cyan('opentool')}\n` +
      `  ${c.cyan('5.')} Generate completions: ${c.cyan('opentool completion --install')}\n` +
      `  ${c.cyan('6.')} Run diagnostics: ${c.cyan('opentool doctor')}\n\n` +
      `${c.gray('Need help? https://github.com/opentool/opentool')}\n\n`,
  )
}
