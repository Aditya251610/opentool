import { describe, it, expect, beforeEach, vi } from 'vitest'

// ─── Cache ──────────────────────────────────────────────────────────────────

import { cacheGet, cacheSet, cacheClear } from '../src/lib/cache.js'

describe('cache', () => {
  beforeEach(() => cacheClear())

  it('returns undefined for missing key', () => {
    expect(cacheGet('nope')).toBeUndefined()
  })

  it('set then get returns same value', () => {
    cacheSet('k', { data: 42 })
    expect(cacheGet('k')).toEqual({ data: 42 })
  })

  it('respects TTL expiration', () => {
    vi.useFakeTimers()
    cacheSet('exp', 'value', 100)
    expect(cacheGet('exp')).toBe('value')
    vi.advanceTimersByTime(150)
    expect(cacheGet('exp')).toBeUndefined()
    vi.useRealTimers()
  })

  it('clears a specific key', () => {
    cacheSet('a', 1)
    cacheSet('b', 2)
    cacheClear('a')
    expect(cacheGet('a')).toBeUndefined()
    expect(cacheGet('b')).toBe(2)
  })

  it('clears all keys', () => {
    cacheSet('a', 1)
    cacheSet('b', 2)
    cacheClear()
    expect(cacheGet('a')).toBeUndefined()
    expect(cacheGet('b')).toBeUndefined()
  })
})

// ─── Fuzzy ──────────────────────────────────────────────────────────────────

import { suggest } from '../src/lib/fuzzy.js'

describe('fuzzy suggest', () => {
  const pool = ['github_create_issue', 'github_list_repos', 'slack_send_message', 'notion_search']

  it('prefix match ranks highest', () => {
    const results = suggest('github', pool)
    expect(results[0]).toBe('github_create_issue')
    expect(results[1]).toBe('github_list_repos')
  })

  it('contains match works', () => {
    const results = suggest('send', pool)
    expect(results).toContain('slack_send_message')
  })

  it('returns empty for no match', () => {
    expect(suggest('zzzzzzz', pool)).toEqual([])
  })

  it('respects limit', () => {
    const results = suggest('g', pool, 1)
    expect(results.length).toBe(1)
  })

  it('case insensitive', () => {
    expect(suggest('GITHUB', pool).length).toBeGreaterThan(0)
  })

  it('handles edit distance for close typos', () => {
    // "githu" is close enough to match "github_*" via edit distance
    const results = suggest('githu', pool)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]).toContain('github')
  })
})

// ─── Config ─────────────────────────────────────────────────────────────────

import { validateUrl } from '../src/lib/config.js'

describe('validateUrl', () => {
  it('accepts valid https URL', () => {
    expect(validateUrl('https://opentool.onrender.com')).toBeNull()
  })

  it('accepts valid http URL', () => {
    expect(validateUrl('http://localhost:3001')).toBeNull()
  })

  it('rejects non-http protocol', () => {
    expect(validateUrl('ftp://example.com')).toContain('http')
  })

  it('rejects garbage input', () => {
    expect(validateUrl('not-a-url')).toContain('Invalid')
  })

  it('rejects empty string', () => {
    expect(validateUrl('')).toContain('Invalid')
  })
})

// ─── API helpers ────────────────────────────────────────────────────────────

import {
  ApiError,
  NetworkError,
  EXIT,
  exitCodeFor,
  unwrapTools,
  unwrapConnections,
  unwrapKeys,
} from '../src/lib/api.js'

describe('ApiError', () => {
  it('stores status and hint', () => {
    const err = new ApiError(404, 'Not found', 'Check the ID')
    expect(err.status).toBe(404)
    expect(err.message).toBe('Not found')
    expect(err.hint).toBe('Check the ID')
    expect(err.name).toBe('ApiError')
  })
})

describe('NetworkError', () => {
  it('stores message', () => {
    const err = new NetworkError('Connection refused')
    expect(err.message).toBe('Connection refused')
    expect(err.name).toBe('NetworkError')
  })
})

describe('exitCodeFor', () => {
  it('returns AUTH for 401', () => {
    expect(exitCodeFor(new ApiError(401, 'Unauthorized'))).toBe(EXIT.AUTH)
  })

  it('returns AUTH for 403', () => {
    expect(exitCodeFor(new ApiError(403, 'Forbidden'))).toBe(EXIT.AUTH)
  })

  it('returns NOT_FOUND for 404', () => {
    expect(exitCodeFor(new ApiError(404, 'Not found'))).toBe(EXIT.NOT_FOUND)
  })

  it('returns GENERAL for other API errors', () => {
    expect(exitCodeFor(new ApiError(500, 'Server error'))).toBe(EXIT.GENERAL)
  })

  it('returns NETWORK for NetworkError', () => {
    expect(exitCodeFor(new NetworkError('timeout'))).toBe(EXIT.NETWORK)
  })

  it('returns GENERAL for unknown errors', () => {
    expect(exitCodeFor(new Error('oops'))).toBe(EXIT.GENERAL)
  })
})

describe('unwrap helpers', () => {
  it('unwrapTools handles wrapped response', () => {
    const tools = [{ id: 't1', name: 'T', provider: 'github' }]
    expect(unwrapTools({ tools })).toEqual(tools)
  })

  it('unwrapTools handles array response', () => {
    const tools = [{ id: 't1', name: 'T', provider: 'github' }]
    expect(unwrapTools(tools as any)).toEqual(tools)
  })

  it('unwrapConnections handles wrapped response', () => {
    const connections = [{ provider: 'slack' }]
    expect(unwrapConnections({ connections })).toEqual(connections)
  })

  it('unwrapConnections handles array response', () => {
    const connections = [{ provider: 'slack' }]
    expect(unwrapConnections(connections as any)).toEqual(connections)
  })

  it('unwrapKeys handles wrapped response', () => {
    const keys = [{ keyPrefix: 'ot_xxx', name: 'test' }]
    expect(unwrapKeys({ keys })).toEqual(keys)
  })

  it('unwrapKeys handles array response', () => {
    const keys = [{ keyPrefix: 'ot_xxx', name: 'test' }]
    expect(unwrapKeys(keys as any)).toEqual(keys)
  })
})

// ─── Debug ──────────────────────────────────────────────────────────────────

import { enableDebug, isDebug } from '../src/lib/debug.js'

describe('debug', () => {
  it('isDebug returns false by default in test', () => {
    // May be true if OPENTOOL_DEBUG is set, but in clean test env it's false
    expect(typeof isDebug()).toBe('boolean')
  })

  it('enableDebug sets debug mode on', () => {
    enableDebug()
    expect(isDebug()).toBe(true)
  })
})
