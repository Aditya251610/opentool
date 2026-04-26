import { describe, it, expect } from 'vitest'
import { searchToolRegistry, scoreTool, getProviderSummary, buildToolSummary } from '../search'
import { getAllTools, getToolById, getUserTools } from '../../../src/registry'

// Get user tools (non-meta) for search tests
const userTools = getUserTools()

describe('search engine', () => {
  describe('scoreTool', () => {
    it('returns equal score for all tools when no query', () => {
      const tools = getAllTools()
      const scores = tools.map((t) => scoreTool(t, ''))
      expect(scores.every((s) => s === 1)).toBe(true)
    })

    it('gives highest score for exact ID match', () => {
      const tool = getToolById('github_create_issue')!
      const score = scoreTool(tool, 'github_create_issue')
      // exact ID (100) + name includes "github" substring? Let's just check > 100
      expect(score).toBeGreaterThanOrEqual(100)
    })

    it('gives higher score for name match than description match', () => {
      const tool = getToolById('github_create_issue')!
      const nameScore = scoreTool(tool, 'Create GitHub Issue')
      const descScore = scoreTool(tool, 'repository')
      expect(nameScore).toBeGreaterThan(descScore)
    })

    it('gives score for provider match', () => {
      const tool = getToolById('github_create_issue')!
      const score = scoreTool(tool, 'github')
      expect(score).toBeGreaterThan(0)
    })

    it('returns 0 for no match', () => {
      const tool = getToolById('github_create_issue')!
      const score = scoreTool(tool, 'xyznonexistent')
      expect(score).toBe(0)
    })

    it('is case-insensitive', () => {
      const tool = getToolById('github_create_issue')!
      const lower = scoreTool(tool, 'github')
      const upper = scoreTool(tool, 'GITHUB')
      expect(lower).toBe(upper)
    })
  })

  describe('searchToolRegistry', () => {
    it('returns all non-meta tools when no options', () => {
      const result = searchToolRegistry({}, userTools)
      expect(result.total).toBeGreaterThan(0)
      // Should not include meta tools
      expect(result.tools.every((t) => t.provider !== 'meta')).toBe(true)
    })

    it('filters by provider', () => {
      const result = searchToolRegistry({ provider: 'github' }, userTools)
      expect(result.tools.length).toBeGreaterThan(0)
      expect(result.tools.every((t) => t.provider === 'github')).toBe(true)
    })

    it('filters by category', () => {
      const result = searchToolRegistry({ category: 'email' }, userTools)
      expect(result.tools.length).toBeGreaterThan(0)
      expect(result.tools.every((t) => t.category === 'email')).toBe(true)
    })

    it('filters by auth type', () => {
      const result = searchToolRegistry({ authType: 'api_key' }, userTools)
      expect(result.tools.length).toBeGreaterThan(0)
      expect(result.tools.every((t) => t.authType === 'api_key')).toBe(true)
    })

    it('filters by readOnly annotation', () => {
      const result = searchToolRegistry({ readOnly: true }, userTools)
      expect(result.tools.length).toBeGreaterThan(0)
      expect(result.tools.every((t) => t.annotations.readOnlyHint === true)).toBe(true)
    })

    it('searches by keyword', () => {
      const result = searchToolRegistry({ query: 'github' }, userTools)
      expect(result.tools.length).toBeGreaterThan(0)
      expect(result.tools.some((t) => t.provider === 'github')).toBe(true)
    })

    it('returns empty for non-matching keyword', () => {
      const result = searchToolRegistry({ query: 'xyznonexistent123' }, userTools)
      expect(result.tools).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('respects limit', () => {
      const result = searchToolRegistry({ limit: 3 }, userTools)
      expect(result.tools.length).toBeLessThanOrEqual(3)
      expect(result.limit).toBe(3)
    })

    it('respects offset', () => {
      const all = searchToolRegistry({ limit: 50 }, userTools)
      const offset = searchToolRegistry({ limit: 50, offset: 2 }, userTools)
      expect(offset.total).toBe(all.total)
      // When total > limit, both return limit items; otherwise offset returns limit-2
      const expectedLen = Math.min(all.total - 2, 50)
      expect(offset.tools.length).toBe(expectedLen)
    })

    it('returns hasMore when more results exist', () => {
      const result = searchToolRegistry({ limit: 2 }, userTools)
      if (result.total > 2) {
        expect(result.hasMore).toBe(true)
      }
    })

    it('caps limit at TOOL_QUERY_MAX_LIMIT', () => {
      const result = searchToolRegistry({ limit: 999 }, userTools)
      expect(result.limit).toBeLessThanOrEqual(50)
    })

    it('clamps offset to 0 minimum', () => {
      const result = searchToolRegistry({ offset: -5 }, userTools)
      expect(result.offset).toBe(0)
    })

    it('combines multiple filters', () => {
      const result = searchToolRegistry({ provider: 'github', readOnly: true }, userTools)
      expect(result.tools.every((t) => t.provider === 'github')).toBe(true)
      expect(result.tools.every((t) => t.annotations.readOnlyHint === true)).toBe(true)
    })

    it('sorts by relevance score (exact match first)', () => {
      const result = searchToolRegistry({ query: 'gmail_send_email' }, userTools)
      if (result.tools.length > 0) {
        expect(result.tools[0].id).toBe('gmail_send_email')
      }
    })

    it('handles special characters in query safely', () => {
      const result = searchToolRegistry({ query: '<script>alert(1)</script>' }, userTools)
      expect(result.tools).toHaveLength(0)
    })
  })

  describe('getProviderSummary', () => {
    it('returns summaries for all providers', () => {
      const summaries = getProviderSummary(userTools)
      expect(summaries.length).toBeGreaterThan(0)
      // Should not include meta provider
      expect(summaries.every((s) => s.provider !== 'meta')).toBe(true)
    })

    it('includes toolCount for each provider', () => {
      const summaries = getProviderSummary(userTools)
      for (const s of summaries) {
        expect(s.toolCount).toBeGreaterThan(0)
      }
    })

    it('includes categories for each provider', () => {
      const summaries = getProviderSummary(userTools)
      for (const s of summaries) {
        expect(s.categories.length).toBeGreaterThan(0)
      }
    })

    it('is sorted alphabetically', () => {
      const summaries = getProviderSummary(userTools)
      for (let i = 1; i < summaries.length; i++) {
        expect(summaries[i].provider >= summaries[i - 1].provider).toBe(true)
      }
    })
  })

  describe('buildToolSummary', () => {
    it('builds correct summary', () => {
      const tool = getToolById('github_create_issue')!
      const summary = buildToolSummary(tool, true)
      expect(summary.id).toBe('github_create_issue')
      expect(summary.name).toBe(tool.name)
      expect(summary.provider).toBe('github')
      expect(summary.connected).toBe(true)
      expect(summary.annotations).toBeDefined()
    })

    it('reflects connected=false correctly', () => {
      const tool = getToolById('github_create_issue')!
      const summary = buildToolSummary(tool, false)
      expect(summary.connected).toBe(false)
    })
  })
})
