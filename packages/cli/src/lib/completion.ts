// Tab-completion data for the REPL.

export const TOP_LEVEL_COMMANDS = [
  'help',
  'tools',
  'show',
  'connect',
  'disconnect',
  'execute',
  'exec',
  'run',
  'login',
  'logout',
  'set-key',
  'set-url',
  'keys',
  'status',
  'config',
  'init',
  'history',
  'refresh',
  'doctor',
  'completion',
  'ping',
  'whoami',
  'org',
  'clear',
  'exit',
  'quit',
]

export const KNOWN_PROVIDERS = [
  'github',
  'notion',
  'slack',
  'linear',
  'gmail',
  'google_calendar',
  'stripe',
  'vercel',
  'resend',
  'postgres',
]

const SLASH_ALIASES = TOP_LEVEL_COMMANDS.map((c) => '/' + c)

// Cached tool IDs for dynamic completion (populated lazily)
let cachedToolIds: string[] = []

/** Set available tool IDs for dynamic completion. */
export function setToolIds(ids: string[]): void {
  cachedToolIds = ids
}

/**
 * Given the current input line, return possible completions.
 * Returns the full replacement strings (not just the suffix).
 */
export function complete(line: string): string[] {
  const trimmed = line.trimStart()
  if (!trimmed) return []
  const parts = trimmed.split(/\s+/)

  // Single token — complete command name
  if (parts.length === 1) {
    const prefix = parts[0].toLowerCase()
    const pool = prefix.startsWith('/') ? SLASH_ALIASES : TOP_LEVEL_COMMANDS
    return pool.filter((cmd) => cmd.startsWith(prefix))
  }

  const cmd = parts[0].toLowerCase().replace(/^\//, '')

  // Two tokens — complete provider for connect/disconnect
  if (parts.length === 2 && (cmd === 'connect' || cmd === 'disconnect')) {
    const prefix = parts[1].toLowerCase()
    return KNOWN_PROVIDERS.filter((p) => p.startsWith(prefix)).map((p) => `${parts[0]} ${p}`)
  }

  // Two tokens — complete tool ID for execute/exec/run/show
  if (
    parts.length === 2 &&
    (cmd === 'execute' || cmd === 'exec' || cmd === 'run' || cmd === 'show') &&
    cachedToolIds.length > 0
  ) {
    const prefix = parts[1].toLowerCase()
    return cachedToolIds
      .filter((id) => id.toLowerCase().startsWith(prefix))
      .map((id) => `${parts[0]} ${id}`)
  }

  return []
}
