import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface OpenToolConfig {
  apiKey?: string
  serverUrl: string
  grpcUrl?: string
  debug?: boolean
  orgSlug?: string // Active organization context
}

const CONFIG_DIR = join(homedir(), '.opentool')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

const DEFAULT_SERVER_URL = 'https://opentool.onrender.com'

export function loadConfig(): OpenToolConfig {
  if (!existsSync(CONFIG_FILE)) {
    return { serverUrl: DEFAULT_SERVER_URL }
  }
  try {
    const raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
    return {
      serverUrl: typeof raw.serverUrl === 'string' ? raw.serverUrl : DEFAULT_SERVER_URL,
      apiKey: typeof raw.apiKey === 'string' ? raw.apiKey : undefined,
      grpcUrl: typeof raw.grpcUrl === 'string' ? raw.grpcUrl : undefined,
      debug: typeof raw.debug === 'boolean' ? raw.debug : undefined,
      orgSlug: typeof raw.orgSlug === 'string' ? raw.orgSlug : undefined,
    }
  } catch {
    return { serverUrl: DEFAULT_SERVER_URL }
  }
}

export function saveConfig(config: OpenToolConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 })
  // Ensure file permissions are restricted even if file existed before
  try {
    chmodSync(CONFIG_FILE, 0o600)
  } catch {
    // chmod may fail on some platforms (Windows) — non-critical
  }
}

export async function checkServerHealth(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

/** Validate a URL string. Returns null if valid, error message if not. */
export function validateUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return 'URL must start with http:// or https://'
    }
    return null
  } catch {
    return 'Invalid URL format. Example: https://opentool.onrender.com'
  }
}

/**
 * Derive the gRPC endpoint from the config.
 * Priority: config.grpcUrl > hostname:50051 from serverUrl.
 */
export function deriveGrpcUrl(config: OpenToolConfig): string {
  if (config.grpcUrl) return config.grpcUrl
  try {
    const u = new URL(config.serverUrl)
    return `${u.hostname}:50051`
  } catch {
    return 'localhost:50051'
  }
}

export function configDir(): string {
  return CONFIG_DIR
}
