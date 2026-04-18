// Debug logging infrastructure — enable via OPENTOOL_DEBUG=1 or --debug flag.

let enabled = !!process.env.OPENTOOL_DEBUG

export function enableDebug(): void {
  enabled = true
}

export function isDebug(): boolean {
  return enabled
}

const DIM = process.stdout.isTTY && !process.env.NO_COLOR ? '\x1b[2m' : ''
const RESET = process.stdout.isTTY && !process.env.NO_COLOR ? '\x1b[0m' : ''
const CYAN = process.stdout.isTTY && !process.env.NO_COLOR ? '\x1b[36m' : ''

export function debug(label: string, ...args: unknown[]): void {
  if (!enabled) return
  const ts = new Date().toISOString().slice(11, 23)
  const parts = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 2))).join(' ')
  process.stderr.write(`${DIM}[${ts}]${RESET} ${CYAN}${label}${RESET} ${DIM}${parts}${RESET}\n`)
}

/** Log an HTTP request (method + url + timing). */
export function debugHttp(method: string, url: string, status?: number, ms?: number): void {
  if (!enabled) return
  const statusStr = status ? ` → ${status}` : ''
  const timeStr = ms !== undefined ? ` (${ms}ms)` : ''
  debug('http', `${method} ${url}${statusStr}${timeStr}`)
}
