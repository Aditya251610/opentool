#!/usr/bin/env node
import { Command } from 'commander'
import {
  configCmd,
  connectCmd,
  disconnectCmd,
  executeCmd,
  initCmd,
  keysCmd,
  loginCmd,
  logoutCmd,
  setKeyCmd,
  setUrlCmd,
  setGrpcUrlCmd,
  showToolCmd,
  statusCmd,
  toolsCmd,
  historyCmd,
  doctorCmd,
} from './commands/index.js'
import { registerCompletionCommand } from './commands/completion.js'
import { getVersion } from './lib/version.js'
import { enableDebug } from './lib/debug.js'
import { exitCodeFor } from './lib/api.js'
import { emitErr, c } from './lib/format.js'
import { pickTagline } from './lib/tagline.js'
import { checkForUpdate } from './lib/update-check.js'

// ─── Global process hardening ───────────────────────────────────────────────

// Restore terminal state on crash (important after Ink raw mode)
function restoreTerminal(): void {
  if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
    try {
      process.stdin.setRawMode(false)
    } catch {
      /* best-effort */
    }
  }
  // Reset cursor visibility, mouse tracking, bracketed paste
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[0m\x1b[?25h\x1b[?1000l\x1b[?2004l')
  }
}

process.on('uncaughtException', (error) => {
  restoreTerminal()
  emitErr(`Uncaught exception: ${error.message}`)
  if (process.env.OPENTOOL_DEBUG) console.error(error.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  restoreTerminal()
  emitErr(`Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`)
  if (process.env.OPENTOOL_DEBUG && reason instanceof Error) console.error(reason.stack)
  process.exit(1)
})

// Graceful SIGTERM in CLI mode (REPL has its own handler)
process.on('SIGTERM', () => {
  restoreTerminal()
  process.exit(0)
})

// Load .env from CWD if present (before any commands)
try {
  const { existsSync, readFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  const envPath = join(process.cwd(), '.env')
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, '')
      if (key && !(key in process.env)) process.env[key] = val
    }
  }
} catch {
  /* .env loading is best-effort */
}

// ─── Program setup ──────────────────────────────────────────────────────────

const program = new Command()

program
  .name('opentool')
  .description(`OpenTool CLI — ${pickTagline()}`)
  .version(getVersion(), '-v, --version', 'show CLI version')
  .helpOption('-h, --help', 'show help')
  .option('--debug', 'enable debug logging (shows HTTP requests/responses)')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts()
    if (opts.debug) enableDebug()
    // Set process title for ps/htop visibility
    const cmdName = thisCommand.args?.[0] ?? 'cli'
    process.title = `opentool-${cmdName}`
  })
  .configureOutput({
    // Colorize Commander's built-in help
    writeOut: (str) => {
      let output = str
        .replace(/^Usage:/gm, c.bold(c.cyan('Usage:')))
        .replace(/^Options:/gm, c.bold(c.cyan('Options:')))
        .replace(/^Commands:/gm, c.bold(c.cyan('Commands:')))
        .replace(/^Arguments:/gm, c.bold(c.cyan('Arguments:')))
      process.stdout.write(output)
    },
    writeErr: (str) => process.stderr.write(c.red(str)),
  })
  .addHelpText(
    'after',
    `
${c.bold(c.cyan('Examples:'))}
  $ opentool                              ${c.gray('start interactive REPL')}
  $ opentool init                         ${c.gray('first-time setup wizard')}
  $ opentool login                        ${c.gray('log in via browser')}
  $ opentool tools --query github         ${c.gray('search tools')}
  $ opentool exec github.list_repos --args '{"per_page":5}'
  $ opentool tools --json | jq            ${c.gray('machine-readable output')}
  $ opentool status --json                ${c.gray('check health (scriptable)')}
  $ echo '{"per_page":5}' | opentool exec github.list_repos
  $ opentool --debug exec my.tool         ${c.gray('verbose debug output')}
  $ opentool completion --shell zsh       ${c.gray('generate shell completions')}
  $ opentool doctor                       ${c.gray('diagnose setup issues')}
  $ opentool exec my.tool -t grpc         ${c.gray('execute via gRPC transport')}
  $ opentool exec my.tool -t grpc -s      ${c.gray('stream execution via gRPC')}
  $ opentool status -t grpc               ${c.gray('check gRPC health')}

${c.gray('Docs: https://github.com/opentool/opentool')}
`,
  )

program
  .command('init')
  .description('first-time setup wizard')
  .action(async () => initCmd())

program
  .command('login')
  .description('log in to your OpenTool server')
  .option('-e, --email <email>', 'email address')
  .option('-p, --password <password>', 'password')
  .option('-b, --browser', 'force browser-based login')
  .action(async (opts) => loginCmd(opts))

program
  .command('logout')
  .description('clear the saved API key')
  .action(() => logoutCmd())

program
  .command('tools')
  .description('list available tools')
  .option('-q, --query <text>', 'filter by name, id, or description')
  .option('-p, --provider <provider>', 'filter by provider (e.g. github)')
  .option('-l, --limit <n>', 'max tools to display', parseInt)
  .option('--json', 'machine-readable output')
  .option('-t, --transport <type>', 'transport: http (default) or grpc')
  .action(async (opts) => toolsCmd(opts))

program
  .command('show <tool-id>')
  .description('show details of a single tool')
  .option('--json', 'machine-readable output')
  .action(async (id, opts) => showToolCmd(id, opts))

program
  .command('connect <provider>')
  .description('authenticate a tool provider (opens browser)')
  .action(async (provider) => connectCmd(provider))

program
  .command('disconnect <provider>')
  .description('remove a tool provider connection')
  .option('-y, --yes', 'skip confirmation prompt')
  .action(async (provider, opts) => disconnectCmd(provider, opts))

program
  .command('exec <tool-id>')
  .alias('execute')
  .alias('run')
  .description('execute a tool with JSON args')
  .option('-a, --args <json>', 'tool arguments as JSON string')
  .option('--json', 'output result as JSON only')
  .option('--timeout <ms>', 'override default timeout in ms', parseInt)
  .option('-t, --transport <type>', 'transport: http (default) or grpc')
  .option('-s, --stream', 'use streaming execution (gRPC only)')
  .action(async (toolId, opts) => executeCmd(toolId, opts))

program
  .command('keys')
  .description('list your API keys')
  .option('--json', 'machine-readable output')
  .action(async (opts) => keysCmd(opts))

program
  .command('status')
  .description('check server connection health')
  .option('--json', 'machine-readable output')
  .option('-t, --transport <type>', 'transport: http (default) or grpc')
  .action(async (opts) => statusCmd(opts))

program
  .command('config')
  .description('show current configuration')
  .option('--json', 'machine-readable output')
  .action((opts) => configCmd(opts))

program
  .command('set-key <api-key>')
  .description('save an API key to config')
  .action((key: string) => setKeyCmd(key))

program
  .command('set-url <server-url>')
  .description('set the OpenTool server URL')
  .action((url: string) => setUrlCmd(url))

program
  .command('set-grpc-url <host-port>')
  .description('set the gRPC endpoint (host:port)')
  .action((url: string) => setGrpcUrlCmd(url))

program
  .command('history')
  .description('show command history')
  .option('-n, --lines <n>', 'number of lines to show', parseInt)
  .option('-s, --search <query>', 'search history')
  .action((opts) => historyCmd(opts))

program
  .command('doctor')
  .description('diagnose common configuration issues')
  .action(async () => doctorCmd())

// Shell completion generation
registerCompletionCommand(program)

program
  .command('repl')
  .description('start the interactive REPL (default when no command given)')
  .action(async () => startRepl())

async function startRepl() {
  if (process.env.OPENTOOL_DEBUG) enableDebug()
  process.title = 'opentool-repl'
  const React = await import('react')
  const { render } = await import('ink')
  const { default: App } = await import('./components/App.js')
  process.stdout.write('\x1B[2J\x1B[3J\x1B[H')
  const { unmount, waitUntilExit } = render(React.createElement(App))

  // Ensure terminal is restored when REPL exits (graceful or crash)
  waitUntilExit()
    .then(() => {
      restoreTerminal()
    })
    .catch(() => {
      restoreTerminal()
    })
}

// If no args, launch the REPL.
if (process.argv.length <= 2) {
  startRepl()
} else {
  // Non-blocking update check for CLI commands (not REPL — Banner handles that)
  checkForUpdate().catch(() => {})

  program.parseAsync(process.argv).catch((err) => {
    emitErr(err instanceof Error ? err.message : String(err))
    process.exit(exitCodeFor(err))
  })
}
