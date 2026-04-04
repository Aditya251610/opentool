import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface OpenToolConfig {
  apiKey?: string;
  serverUrl: string;
}

const CONFIG_DIR = join(homedir(), '.opentool');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function loadConfig(): OpenToolConfig {
  if (!existsSync(CONFIG_FILE)) {
    return { serverUrl: 'http://localhost:3001' };
  }
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return { serverUrl: 'http://localhost:3001' };
  }
}

export function saveConfig(config: OpenToolConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function checkServerHealth(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
