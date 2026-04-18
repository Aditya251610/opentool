// ANSI color helpers — no `chalk` dep needed for non-Ink output.
// Respects NO_COLOR (https://no-color.org/) and FORCE_COLOR environment variables.

const hasForceColor =
  typeof process.env.FORCE_COLOR === 'string' &&
  process.env.FORCE_COLOR.trim().length > 0 &&
  process.env.FORCE_COLOR.trim() !== '0'
const isTTY = (process.stdout.isTTY && !process.env.NO_COLOR) || hasForceColor
const wrap = (open: number, close: number) => (s: string) =>
  isTTY ? `\x1b[${open}m${s}\x1b[${close}m` : s

export const c = {
  reset: '\x1b[0m',
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  italic: wrap(3, 23),
  underline: wrap(4, 24),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  magenta: wrap(35, 39),
  cyan: wrap(36, 39),
  white: wrap(37, 39),
  gray: wrap(90, 39),
  bgRed: wrap(41, 49),
  bgGreen: wrap(42, 49),
  bgYellow: wrap(43, 49),
  bgCyan: wrap(46, 49),
}

export const sym = {
  ok: c.green('✓'),
  err: c.red('✗'),
  warn: c.yellow('⚠'),
  info: c.cyan('ℹ'),
  bullet: c.gray('•'),
  arrow: c.cyan('❯'),
  dot: '●',
  dash: c.gray('─'),
}

// ─── Table renderer ────────────────────────────────────────────────────────

export interface Column<T> {
  header: string
  get: (row: T) => string
  width?: number
  color?: (cell: string, row: T) => string
}

function visibleLen(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, '').length
}

function pad(s: string, w: number): string {
  const len = visibleLen(s)
  return len >= w ? s : s + ' '.repeat(w - len)
}

export function table<T>(rows: T[], cols: Column<T>[]): string {
  const widths = cols.map((col) => {
    const headerLen = col.header.length
    const maxData = Math.max(0, ...rows.map((r) => visibleLen(col.get(r))))
    return col.width ?? Math.max(headerLen, maxData)
  })

  const headerLine = cols
    .map((col, i) => c.bold(c.gray(pad(col.header.toUpperCase(), widths[i]))))
    .join('  ')
  const sep = c.gray(widths.map((w) => '─'.repeat(w)).join('  '))
  const dataLines = rows.map((row) =>
    cols
      .map((col, i) => {
        const raw = col.get(row)
        const colored = col.color ? col.color(raw, row) : raw
        return pad(colored, widths[i])
      })
      .join('  '),
  )

  return [headerLine, sep, ...dataLines].join('\n')
}

// ─── Output helpers ────────────────────────────────────────────────────────

export function emitJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n')
}

export function emitOk(msg: string): void {
  process.stdout.write(`${sym.ok} ${msg}\n`)
}
export function emitInfo(msg: string): void {
  process.stdout.write(`${sym.info} ${msg}\n`)
}
export function emitWarn(msg: string): void {
  process.stderr.write(`${sym.warn} ${c.yellow(msg)}\n`)
}
export function emitErr(msg: string, hint?: string): void {
  process.stderr.write(`${sym.err} ${c.red(msg)}\n`)
  if (hint) process.stderr.write(`  ${c.dim(c.gray('hint:'))} ${c.gray(hint)}\n`)
}

export function formatToolId(id: string): string {
  const dot = id.indexOf('.')
  if (dot === -1) return c.cyan(id)
  return c.gray(id.slice(0, dot + 1)) + c.cyan(id.slice(dot + 1))
}

/** Format elapsed time in a human-friendly way. */
export function formatMs(ms: number): string {
  if (ms < 1000) return c.gray(`(${ms}ms)`)
  return c.gray(`(${(ms / 1000).toFixed(1)}s)`)
}

/** Truncate a JSON result string for display. */
export function truncateResult(data: unknown, maxLines = 50): string {
  const str = JSON.stringify(data, null, 2)
  const lines = str.split('\n')
  if (lines.length <= maxLines) return str
  const shown = lines.slice(0, maxLines).join('\n')
  return `${shown}\n${c.dim(`… ${lines.length - maxLines} more lines (use --json for full output)`)}\n`
}

/** Draw a horizontal rule. */
export function hr(width = 40): string {
  return c.gray('─'.repeat(width))
}

/** Box-wrapped section header. */
export function sectionHeader(title: string, subtitle?: string): string {
  const sub = subtitle ? ` ${c.gray(subtitle)}` : ''
  return `\n${c.bold(title)}${sub}\n${hr()}\n`
}
