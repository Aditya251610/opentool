// Non-blocking update check — warns the user if a newer version is available.

import { cacheGet, cacheSet } from './cache.js'
import { getVersion } from './version.js'
import { c, sym } from './format.js'

const CACHE_KEY = 'latest-version'
const CHECK_URL = 'https://registry.npmjs.org/@opentool/cli/latest'

function compareVersions(current: string, latest: string): boolean {
  const a = current.split('.').map(Number)
  const b = latest.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((b[i] ?? 0) > (a[i] ?? 0)) return true
    if ((b[i] ?? 0) < (a[i] ?? 0)) return false
  }
  return false
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(CHECK_URL, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null
    const body = (await res.json()) as { version?: string }
    return body.version ?? null
  } catch {
    return null
  }
}

/**
 * Fire-and-forget update check. Prints a warning if a newer version exists.
 * Result is cached for 1 hour to avoid hammering the registry.
 */
export async function checkForUpdate(): Promise<void> {
  const cached = cacheGet<string>(CACHE_KEY)
  const current = getVersion()

  if (cached) {
    if (compareVersions(current, cached)) {
      printUpdateNotice(current, cached)
    }
    return
  }

  const latest = await fetchLatestVersion()
  if (!latest) return

  // Cache for 1 hour
  cacheSet(CACHE_KEY, latest, 3_600_000)

  if (compareVersions(current, latest)) {
    printUpdateNotice(current, latest)
  }
}

function printUpdateNotice(current: string, latest: string): void {
  process.stderr.write(
    `\n  ${sym.info} ${c.yellow('Update available!')} ${c.gray(current)} → ${c.green(latest)}\n` +
      `    Run ${c.cyan('npm i -g @opentool/cli')} to update\n\n`,
  )
}
