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
  orgEndpoints,
  unwrapConnections,
  unwrapKeys,
  unwrapTools,
} from '../lib/api.js'
import { loadConfig, saveConfig, validateUrl, configDir, deriveGrpcUrl } from '../lib/config.js'
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

    // Post-login: check org memberships and offer to select one
    try {
      const { result: orgResult } = await withSpinner('Checking organizations…', () =>
        orgEndpoints.list(),
      )
      if (orgResult.orgs.length === 1) {
        const org = orgResult.orgs[0]
        saveConfig({ ...loadConfig(), orgSlug: org.slug })
        emitInfo(`Auto-selected org: ${c.cyan(org.slug)} (${org.name})`)
      } else if (orgResult.orgs.length > 1) {
        process.stdout.write(
          `\n  You belong to ${c.bold(String(orgResult.orgs.length))} organizations:\n`,
        )
        orgResult.orgs.forEach((o: any, i: number) => {
          process.stdout.write(
            `    ${c.gray(`${i + 1}.`)} ${c.cyan(o.slug)} — ${o.name} [${o.role}]\n`,
          )
        })
        process.stdout.write(
          `\n  ${c.gray('Set active org with:')} ${c.cyan('opentool org use <slug>')}\n\n`,
        )
      }
    } catch {
      // Org fetch failed — non-critical, skip silently
    }
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
  opts: {
    query?: string
    json?: boolean
    provider?: string
    limit?: number
    transport?: string
  } = {},
) {
  // gRPC transport path
  if (opts.transport === 'grpc') {
    try {
      const { getGrpcTransport, closeGrpcTransport } = await import('../lib/grpc-client.js')
      const { result: data, elapsedMs } = await withSpinner('Loading tools via gRPC', async () => {
        const transport = await getGrpcTransport()
        const res = await transport.listTools({
          provider: opts.provider || '',
          connectedOnly: false,
        })
        return res
      })

      let tools = (data.tools ?? []) as {
        id: string
        name: string
        provider: string
        description?: string
      }[]
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
        emitJson(tools)
        closeGrpcTransport()
        return
      }

      if (tools.length === 0) {
        emitWarn('No tools match your filter')
        closeGrpcTransport()
        return
      }

      process.stdout.write(
        sectionHeader('Tools (gRPC)', `${tools.length} total ${formatMs(elapsedMs)}`),
      )
      process.stdout.write(
        table(tools, [
          { header: 'id', get: (t) => t.id, color: (_, t) => formatToolId(t.id) },
          { header: 'name', get: (t) => t.name, color: (s) => c.white(s) },
          { header: 'provider', get: (t) => t.provider, color: (s) => c.cyan(s) },
        ]) + '\n\n',
      )
      closeGrpcTransport()
      return
    } catch (err) {
      handleApiError(err)
    }
  }

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
  opts: {
    args?: string
    json?: boolean
    timeout?: number
    transport?: string
    stream?: boolean
  } = {},
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

  // gRPC transport path
  if (opts.transport === 'grpc') {
    try {
      const { getGrpcTransport, closeGrpcTransport } = await import('../lib/grpc-client.js')
      const timeoutMs = opts.timeout ?? 60_000

      if (opts.stream) {
        // Streaming execution — show progress events in real-time
        const transport = await getGrpcTransport()
        const start = Date.now()
        process.stdout.write(`\n  ${c.gray('Streaming')} ${formatToolId(toolId)} via gRPC…\n`)

        let finalResult: unknown = null
        for await (const event of transport.executeStream(toolId, args, timeoutMs)) {
          const status = event.status ?? event.executionStatus ?? 'UNKNOWN'
          if (status === 'STARTED' || status === 1) {
            process.stdout.write(`  ${c.yellow('▸')} Started\n`)
          } else if (status === 'PROGRESS' || status === 2) {
            const msg = event.progressMessage ?? event.progress_message ?? ''
            process.stdout.write(`  ${c.blue('▸')} ${msg}\n`)
          } else if (status === 'COMPLETED' || status === 3) {
            finalResult = event.resultJson ? JSON.parse(event.resultJson) : event.result
          } else if (status === 'ERROR' || status === 4) {
            const errMsg = event.errorMessage ?? event.error_message ?? 'Unknown error'
            emitErr(`Tool execution failed: ${errMsg}`)
            closeGrpcTransport()
            process.exit(EXIT.TOOL)
          }
        }

        const elapsedMs = Date.now() - start
        emitOk(`Executed ${formatToolId(toolId)} via gRPC stream ${formatMs(elapsedMs)}`)
        if (finalResult !== null) {
          if (opts.json) {
            emitJson(finalResult)
          } else {
            process.stdout.write(c.gray(hr()) + '\n')
            process.stdout.write(
              typeof finalResult === 'string'
                ? finalResult + '\n'
                : truncateResult(finalResult) + '\n',
            )
          }
        }
        closeGrpcTransport()
        return
      }

      // Unary gRPC execution
      const { result: data, elapsedMs } = await withSpinner(
        `Executing ${c.cyan(toolId)} via gRPC`,
        async () => {
          const transport = await getGrpcTransport()
          return transport.executeTool(toolId, args, timeoutMs)
        },
      )

      const result = data.resultJson ? JSON.parse(data.resultJson) : (data.result ?? data)
      if (opts.json) {
        emitJson(result)
        closeGrpcTransport()
        return
      }

      emitOk(`Executed ${formatToolId(toolId)} via gRPC ${formatMs(elapsedMs)}`)
      process.stdout.write(c.gray(hr()) + '\n')
      if (typeof result === 'string') {
        process.stdout.write(result + '\n')
      } else if (Array.isArray(result) && result.length === 0) {
        process.stdout.write(c.gray('(empty result)') + '\n')
      } else {
        process.stdout.write(truncateResult(result) + '\n')
      }
      closeGrpcTransport()
      return
    } catch (err) {
      handleApiError(err)
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

export async function statusCmd(opts: { json?: boolean; transport?: string } = {}) {
  const config = loadConfig()
  const version = (await import('../lib/version.js')).getVersion()
  const start = Date.now()
  let healthy = false
  let serverVersion: string | undefined
  let toolCount: number | undefined

  // gRPC health check
  let grpcHealthy = false
  let grpcLatency = 0
  if (opts.transport === 'grpc') {
    try {
      const { checkGrpcHealth } = await import('../lib/grpc-client.js')
      const grpcUrl = deriveGrpcUrl(config)
      const res = await checkGrpcHealth(grpcUrl)
      grpcHealthy = res.serving
      grpcLatency = res.latencyMs

      if (opts.json) {
        return emitJson({
          transport: 'grpc',
          grpcUrl,
          healthy: grpcHealthy,
          latencyMs: grpcLatency,
          authenticated: !!config.apiKey,
          cliVersion: version,
        })
      }
      process.stdout.write(
        `\n  ${c.gray('transport:')} ${c.cyan('gRPC')}\n` +
          `  ${c.gray('grpcUrl:')}   ${c.cyan(grpcUrl)}\n` +
          `  ${c.gray('health:')}    ${
            grpcHealthy
              ? `${sym.ok} ${c.green('serving')} ${formatMs(grpcLatency)}`
              : `${sym.err} ${c.red('unreachable')}`
          }\n` +
          `  ${c.gray('auth:')}      ${
            config.apiKey
              ? `${sym.ok} ${c.green('logged in')}`
              : `${sym.warn} ${c.yellow('not logged in')}`
          }\n` +
          `  ${c.gray('cli:')}       v${version}\n\n`,
      )
      return
    } catch (err) {
      handleApiError(err)
    }
  }

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
  const grpcUrl = deriveGrpcUrl(config)
  if (opts.json) return emitJson({ ...config, grpcUrl })
  process.stdout.write(
    `\n  ${c.gray('serverUrl:')} ${c.cyan(config.serverUrl)}\n` +
      `  ${c.gray('grpcUrl:')}   ${c.cyan(grpcUrl)}${config.grpcUrl ? '' : c.gray(' (derived)')}\n` +
      `  ${c.gray('apiKey:')}    ${
        config.apiKey ? c.green(`${config.apiKey.slice(0, 11)}…`) : c.yellow('(not set)')
      }\n` +
      `  ${c.gray('org:')}       ${config.orgSlug ? c.magenta(config.orgSlug) : c.gray('(none)')}\n` +
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

export function setGrpcUrlCmd(url: string) {
  if (!url) {
    emitErr('Missing gRPC URL', 'Usage: opentool set-grpc-url <host:port>')
    process.exit(EXIT.GENERAL)
  }
  // Basic validation: should be host:port format
  if (!/^[a-zA-Z0-9._-]+:\d+$/.test(url)) {
    emitErr('Invalid gRPC URL format', 'Expected host:port, e.g. localhost:50051')
    process.exit(EXIT.GENERAL)
  }
  const config = loadConfig()
  saveConfig({ ...config, grpcUrl: url })
  emitOk(`gRPC URL set to ${c.cyan(url)}`)
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

  // 10. gRPC server reachable (best-effort, non-blocking)
  const grpcUrl = deriveGrpcUrl(config)
  try {
    const { checkGrpcHealth } = await import('../lib/grpc-client.js')
    const grpcRes = await checkGrpcHealth(grpcUrl)
    checks.push({
      label: 'gRPC endpoint',
      ok: grpcRes.serving,
      detail: grpcRes.serving
        ? `${grpcUrl} — serving ${formatMs(grpcRes.latencyMs)}`
        : `${grpcUrl} — not reachable (gRPC may be disabled)`,
    })
  } catch {
    checks.push({
      label: 'gRPC endpoint',
      ok: false,
      detail: `${grpcUrl} — gRPC deps not installed (optional)`,
    })
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

// ─── Organization Commands ──────────────────────────────────────────────────

export async function orgCmd(sub?: string, opts: { json?: boolean } = {}) {
  const config = loadConfig()

  if (!sub || sub === 'list') {
    const {
      result: { orgs },
    } = await withSpinner('Fetching organizations…', () => orgEndpoints.list())
    if (opts.json) return emitJson(orgs)
    if (orgs.length === 0) {
      emitInfo('No organizations yet. Create one with: opentool org create <name> <slug>')
      return
    }
    process.stdout.write(
      '\n' +
        table(orgs, [
          {
            header: '',
            get: (o: any) => (config.orgSlug === o.slug ? '●' : ''),
            color: (s: string) => c.green(s),
          },
          { header: 'slug', get: (o: any) => o.slug, color: (s: string) => c.cyan(s) },
          { header: 'name', get: (o: any) => o.name },
          { header: 'role', get: (o: any) => o.role, color: (s: string) => c.yellow(s) },
          { header: 'plan', get: (o: any) => o.plan },
        ]) +
        '\n',
    )
    if (config.orgSlug) {
      process.stdout.write(`  ${c.gray('Active org:')} ${c.cyan(config.orgSlug)}\n\n`)
    }
    return
  }

  if (sub === 'use') {
    // handled separately via orgUseCmd
    return
  }

  if (sub === 'unset') {
    if (!config.orgSlug) {
      emitInfo('No active organization to unset.')
      return
    }
    const prev = config.orgSlug
    saveConfig({ ...config, orgSlug: undefined })
    emitOk(`Unset organization context (was: ${prev})`)
    return
  }

  if (sub === 'info') {
    if (!config.orgSlug) {
      emitErr('No active organization', 'Set one with: opentool org use <slug>')
      process.exit(EXIT.GENERAL)
    }
    const {
      result: { org, role },
    } = await withSpinner('Fetching org info…', () => orgEndpoints.get(config.orgSlug!))
    if (opts.json) return emitJson({ org, role })
    process.stdout.write(
      `\n  ${c.gray('Name:')} ${c.bold(org.name)}\n` +
        `  ${c.gray('Slug:')} ${c.cyan(org.slug)}\n` +
        `  ${c.gray('Plan:')} ${org.plan}\n` +
        `  ${c.gray('Your role:')} ${c.yellow(role)}\n\n`,
    )
    return
  }

  if (sub === 'members') {
    if (!config.orgSlug) {
      emitErr('No active organization', 'Set one with: opentool org use <slug>')
      process.exit(EXIT.GENERAL)
    }
    const {
      result: { members },
    } = await withSpinner('Fetching members…', () => orgEndpoints.members(config.orgSlug!))
    if (opts.json) return emitJson(members)
    process.stdout.write(
      '\n' +
        table(members, [
          { header: 'email', get: (m: any) => m.email, color: (s: string) => c.cyan(s) },
          { header: 'name', get: (m: any) => m.name || '—' },
          { header: 'role', get: (m: any) => m.role, color: (s: string) => c.yellow(s) },
        ]) +
        '\n',
    )
    return
  }

  if (sub === 'teams') {
    if (!config.orgSlug) {
      emitErr('No active organization', 'Set one with: opentool org use <slug>')
      process.exit(EXIT.GENERAL)
    }
    const {
      result: { teams },
    } = await withSpinner('Fetching teams…', () => orgEndpoints.teams(config.orgSlug!))
    if (opts.json) return emitJson(teams)
    process.stdout.write(
      '\n' +
        table(teams, [
          { header: 'slug', get: (t: any) => t.slug, color: (s: string) => c.cyan(s) },
          { header: 'name', get: (t: any) => t.name },
          { header: 'members', get: (t: any) => String(t.memberCount) },
        ]) +
        '\n',
    )
    return
  }

  emitErr(`Unknown org subcommand: ${sub}`, 'Available: list, use, unset, info, members, teams')
}

export function orgUseCmd(slug: string) {
  if (!slug) {
    emitErr('Missing org slug', 'Usage: opentool org use <slug>')
    process.exit(EXIT.GENERAL)
  }
  const config = loadConfig()
  saveConfig({ ...config, orgSlug: slug })
  emitOk(`Active organization set to: ${c.cyan(slug)}`)
  emitInfo('All subsequent API calls will include this org context.')
}

export async function orgCreateCmd(name: string, slug: string, opts: { json?: boolean } = {}) {
  if (!name || !slug) {
    emitErr('Missing arguments', 'Usage: opentool org create <name> <slug>')
    process.exit(EXIT.GENERAL)
  }
  const {
    result: { org },
  } = await withSpinner('Creating organization…', () => orgEndpoints.create(name, slug))
  if (opts.json) return emitJson(org)
  emitOk(`Organization created: ${c.bold(org.name)} (${c.cyan(org.slug)})`)
  // Auto-set as active
  const config = loadConfig()
  saveConfig({ ...config, orgSlug: org.slug })
  emitInfo(`Set as active org. All commands now run in ${c.cyan(org.slug)} context.`)
}
