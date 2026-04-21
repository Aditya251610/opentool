/**
 * Token counting service — maps MCP client names to accurate tokenizers.
 *
 * Uses js-tiktoken (pure JS, no WASM) for token counting.
 * Tokenizer instances are cached globally — expensive to init, cheap to reuse.
 *
 * Token counting is always fire-and-forget: callers should never await
 * this in the hot path of tool execution.
 */
import { getEncoding, Tiktoken } from 'js-tiktoken'
import { logger } from '../logger'

// ─── Client → Encoding Map ───────────────

type TiktokenEncoding = 'cl100k_base' | 'o200k_base'

/**
 * Maps known MCP client names to their tiktoken encoding.
 * cl100k_base: GPT-4, GPT-3.5, Claude (close enough), Gemini fallback
 * o200k_base: GPT-4o, o1, o3 models
 */
const CLIENT_ENCODING_MAP: Record<string, TiktokenEncoding> = {
  // OpenAI / GPT-4o clients
  'vscode-copilot': 'o200k_base',
  'copilot-cli': 'o200k_base',
  'github-copilot': 'o200k_base',

  // Cursor (uses multiple models but GPT-4o dominant)
  cursor: 'o200k_base',

  // Claude clients — cl100k_base is ~90% accurate for Claude tokenizer
  'claude-desktop': 'cl100k_base',
  'claude-code': 'cl100k_base',

  // Gemini — cl100k_base as universal fallback (~85-95% accurate)
  'gemini-cli': 'cl100k_base',

  // Windsurf
  windsurf: 'cl100k_base',

  // Copilot Studio
  mcs: 'o200k_base',

  // OpenTool's own stateless mode
  'opentool-http': 'cl100k_base',
}

// ─── Tokenizer Cache ──────────────────────

const tokenizerCache = new Map<TiktokenEncoding, Tiktoken>()

function getTokenizer(encoding: TiktokenEncoding): Tiktoken {
  let tokenizer = tokenizerCache.get(encoding)
  if (!tokenizer) {
    tokenizer = getEncoding(encoding)
    tokenizerCache.set(encoding, tokenizer)
  }
  return tokenizer
}

// ─── Public API ───────────────────────────

export interface TokenCount {
  inputTokens: number
  outputTokens: number
  schemaTokens: number
  totalTokens: number
}

/**
 * Resolves the tiktoken encoding for a given MCP client name.
 * Falls back to cl100k_base for unknown clients.
 */
export function resolveEncoding(clientName: string): TiktokenEncoding {
  const normalized = clientName.toLowerCase().trim()

  // Exact match first
  if (CLIENT_ENCODING_MAP[normalized]) {
    return CLIENT_ENCODING_MAP[normalized]
  }

  // Partial match — e.g. "copilot-cli/1.2.3" or "cursor-ai"
  for (const [key, encoding] of Object.entries(CLIENT_ENCODING_MAP)) {
    if (normalized.includes(key)) return encoding
  }

  return 'cl100k_base' // universal fallback
}

/**
 * Counts tokens in a string using the tokenizer matched to the client.
 * Returns 0 on error — never throws.
 */
export function countTokens(text: string, clientName: string): number {
  if (!text) return 0

  try {
    const encoding = resolveEncoding(clientName)
    const tokenizer = getTokenizer(encoding)
    return tokenizer.encode(text).length
  } catch (error) {
    logger.warn('Token counting failed, using char/4 estimate', {
      error: error instanceof Error ? error.message : 'unknown',
      clientName,
    })
    return Math.ceil(text.length / 4)
  }
}

/**
 * Counts tokens for a complete tool invocation: schema + input + output.
 * All values are stringified before counting.
 */
export function countToolTokens(
  schema: unknown,
  input: unknown,
  output: unknown,
  clientName: string,
): TokenCount {
  const schemaStr = typeof schema === 'string' ? schema : JSON.stringify(schema ?? '')
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input ?? '')
  const outputStr = typeof output === 'string' ? output : JSON.stringify(output ?? '')

  const schemaTokens = countTokens(schemaStr, clientName)
  const inputTokens = countTokens(inputStr, clientName)
  const outputTokens = countTokens(outputStr, clientName)

  return {
    schemaTokens,
    inputTokens,
    outputTokens,
    totalTokens: schemaTokens + inputTokens + outputTokens,
  }
}

/**
 * Returns the list of known MCP client names for documentation/display.
 */
export function getKnownClients(): string[] {
  return Object.keys(CLIENT_ENCODING_MAP)
}
