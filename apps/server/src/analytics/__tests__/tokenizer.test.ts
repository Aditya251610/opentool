import { describe, it, expect } from 'vitest'
import { countTokens, countToolTokens, resolveEncoding, getKnownClients } from '../tokenizer'

describe('tokenizer', () => {
  describe('resolveEncoding', () => {
    it('maps copilot-cli to o200k_base', () => {
      expect(resolveEncoding('copilot-cli')).toBe('o200k_base')
    })

    it('maps cursor to o200k_base', () => {
      expect(resolveEncoding('cursor')).toBe('o200k_base')
    })

    it('maps claude-desktop to cl100k_base', () => {
      expect(resolveEncoding('claude-desktop')).toBe('cl100k_base')
    })

    it('maps gemini-cli to cl100k_base', () => {
      expect(resolveEncoding('gemini-cli')).toBe('cl100k_base')
    })

    it('falls back to cl100k_base for unknown clients', () => {
      expect(resolveEncoding('totally-unknown-agent')).toBe('cl100k_base')
    })

    it('handles case-insensitive matching', () => {
      expect(resolveEncoding('CURSOR')).toBe('o200k_base')
      expect(resolveEncoding('Claude-Desktop')).toBe('cl100k_base')
    })

    it('handles partial matching (e.g. versioned names)', () => {
      expect(resolveEncoding('copilot-cli/1.2.3')).toBe('o200k_base')
      expect(resolveEncoding('cursor-ai-editor')).toBe('o200k_base')
    })
  })

  describe('countTokens', () => {
    it('returns 0 for empty string', () => {
      expect(countTokens('', 'cursor')).toBe(0)
    })

    it('counts tokens for a simple string', () => {
      const count = countTokens('Hello, world!', 'cursor')
      expect(count).toBeGreaterThan(0)
      expect(count).toBeLessThan(10)
    })

    it('counts tokens consistently for same input', () => {
      const text = 'The quick brown fox jumps over the lazy dog'
      const a = countTokens(text, 'cursor')
      const b = countTokens(text, 'cursor')
      expect(a).toBe(b)
    })

    it('longer text produces more tokens', () => {
      const short = countTokens('hello', 'cursor')
      const long = countTokens('hello world this is a longer sentence with more tokens', 'cursor')
      expect(long).toBeGreaterThan(short)
    })

    it('works with different clients', () => {
      const text = 'Hello, world!'
      const cursorCount = countTokens(text, 'cursor')
      const claudeCount = countTokens(text, 'claude-desktop')
      // Both should return reasonable values (encodings differ slightly)
      expect(cursorCount).toBeGreaterThan(0)
      expect(claudeCount).toBeGreaterThan(0)
    })

    it('handles JSON input', () => {
      const json = JSON.stringify({ tool: 'github_create_issue', args: { title: 'Bug fix' } })
      const count = countTokens(json, 'cursor')
      expect(count).toBeGreaterThan(5)
    })
  })

  describe('countToolTokens', () => {
    it('counts schema + input + output tokens', () => {
      const schema = { type: 'object', properties: { title: { type: 'string' } } }
      const input = { title: 'Test issue' }
      const output = { id: 123, url: 'https://github.com/org/repo/issues/123' }

      const result = countToolTokens(schema, input, output, 'cursor')
      expect(result.schemaTokens).toBeGreaterThan(0)
      expect(result.inputTokens).toBeGreaterThan(0)
      expect(result.outputTokens).toBeGreaterThan(0)
      expect(result.totalTokens).toBe(
        result.schemaTokens + result.inputTokens + result.outputTokens,
      )
    })

    it('handles null/undefined gracefully', () => {
      const result = countToolTokens(null, undefined, null, 'cursor')
      expect(result.totalTokens).toBeGreaterThanOrEqual(0)
    })

    it('handles string inputs', () => {
      const result = countToolTokens('schema text', 'input text', 'output text', 'cursor')
      expect(result.schemaTokens).toBeGreaterThan(0)
      expect(result.inputTokens).toBeGreaterThan(0)
      expect(result.outputTokens).toBeGreaterThan(0)
    })
  })

  describe('getKnownClients', () => {
    it('returns an array of known client names', () => {
      const clients = getKnownClients()
      expect(Array.isArray(clients)).toBe(true)
      expect(clients.length).toBeGreaterThan(5)
      expect(clients).toContain('cursor')
      expect(clients).toContain('copilot-cli')
      expect(clients).toContain('claude-desktop')
    })
  })
})
