import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'

const HISTORY_FILE = join(homedir(), '.opentool', 'history')
const MAX_HISTORY = 500

export function loadHistory(): string[] {
  if (!existsSync(HISTORY_FILE)) return []
  try {
    const lines = readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean)
    return lines.slice(-MAX_HISTORY)
  } catch {
    return []
  }
}

export function appendHistory(line: string): void {
  const trimmed = line.trim()
  if (!trimmed) return
  try {
    const dir = dirname(HISTORY_FILE)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    appendFileSync(HISTORY_FILE, trimmed + '\n')
  } catch {
    // history is best-effort; ignore failures
  }
}

/** Search history for entries matching a query (case-insensitive, newest first). */
export function searchHistory(query: string): string[] {
  const all = loadHistory()
  const q = query.toLowerCase()
  return all.filter((line) => line.toLowerCase().includes(q)).reverse()
}

/** Compact history file: remove duplicates (keep last occurrence), trim to MAX_HISTORY. */
export function compactHistory(): void {
  try {
    const lines = loadHistory()
    const seen = new Set<string>()
    const deduped: string[] = []
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!seen.has(lines[i])) {
        seen.add(lines[i])
        deduped.unshift(lines[i])
      }
    }
    const dir = dirname(HISTORY_FILE)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(HISTORY_FILE, deduped.slice(-MAX_HISTORY).join('\n') + '\n')
  } catch {
    // best-effort
  }
}
