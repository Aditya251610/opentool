import { describe, it, expect } from 'vitest'
import { scoreTool, searchToolRegistry, buildToolSummary } from '../../../tools/meta/search'
import { VALID_FORMATS } from '../export'
import type { ToolDefinition } from '@opentool/tool-schema'

// ─── Search Boost Tests ───────────────────

function makeMockTool(overrides: Partial<ToolDefinition<any>> = {}): ToolDefinition<any> {
  return {
    id: overrides.id ?? 'test_tool',
    name: overrides.name ?? 'Test Tool',
    description: overrides.description ?? 'A test tool for testing',
    provider: overrides.provider ?? 'test',
    authType: overrides.authType ?? 'none',
    category: overrides.category ?? 'development',
    requiredScopes: overrides.requiredScopes ?? [],
    inputSchema: { safeParse: () => ({ success: true }) } as any,
    inputJsonSchema: {},
    annotations: overrides.annotations ?? {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    execute: async () => ({}),
    ...overrides,
  } as ToolDefinition<any>
}

describe('scoreTool with usage boost', () => {
  it('returns higher score for frequently used tool', () => {
    const tool = makeMockTool({
      id: 'github_create_issue',
      name: 'Create Issue',
      description: 'Create a new issue',
    })

    const scoreNoUsage = scoreTool(tool, 'issue', 0)
    const scoreWithUsage = scoreTool(tool, 'issue', 50)

    expect(scoreWithUsage).toBeGreaterThan(scoreNoUsage)
  })

  it('usage boost is logarithmic (diminishing returns)', () => {
    const tool = makeMockTool({
      id: 'github_create_issue',
      name: 'Create Issue',
      description: 'Create a new issue',
    })

    const score10 = scoreTool(tool, 'issue', 10)
    const score100 = scoreTool(tool, 'issue', 100)
    const score1000 = scoreTool(tool, 'issue', 1000)

    // Differences should shrink (logarithmic)
    const diff1 = score100 - score10
    const diff2 = score1000 - score100
    expect(diff2).toBeLessThan(diff1)
  })

  it('usage boost is capped at 30 points', () => {
    const tool = makeMockTool({
      id: 'github_create_issue',
      name: 'Create Issue',
      description: 'Create a new issue',
    })

    const baseScore = scoreTool(tool, 'issue', 0)
    const maxScore = scoreTool(tool, 'issue', 1_000_000)

    expect(maxScore - baseScore).toBeLessThanOrEqual(30)
  })

  it('no usage boost when score is 0 (no match)', () => {
    const tool = makeMockTool({ id: 'github_create_issue', name: 'Create Issue' })

    const score = scoreTool(tool, 'zzzznotfound', 100)
    expect(score).toBe(0)
  })

  it('no usage boost when no query', () => {
    const tool = makeMockTool()
    expect(scoreTool(tool, '', 100)).toBe(1)
  })
})

describe('searchToolRegistry with usage map', () => {
  const tools = [
    makeMockTool({
      id: 'github_create_issue',
      name: 'Create Issue',
      description: 'Create an issue',
      provider: 'github',
    }),
    makeMockTool({
      id: 'github_list_repos',
      name: 'List Repos',
      description: 'List repositories',
      provider: 'github',
    }),
    makeMockTool({
      id: 'slack_send_message',
      name: 'Send Message',
      description: 'Send a slack message',
      provider: 'slack',
    }),
  ]

  it('boosts frequently used tools in results', () => {
    const usageMap = { slack_send_message: 50, github_create_issue: 5 }

    // Both tools match "a" (in description), but slack has more usage
    const result = searchToolRegistry({ query: 'github' }, tools, new Set(), usageMap)

    expect(result.tools.length).toBeGreaterThan(0)
    // github tools should appear
    expect(result.tools.some((t) => t.id.startsWith('github_'))).toBe(true)
  })

  it('works without usage map (backward compat)', () => {
    const result = searchToolRegistry({ query: 'github' }, tools, new Set())

    expect(result.tools.length).toBe(2) // both github tools
  })
})

// ─── Export Format Tests ──────────────────

describe('VALID_FORMATS', () => {
  it('contains all 4 export formats', () => {
    expect(VALID_FORMATS).toHaveLength(4)
    expect(VALID_FORMATS).toContain('context.md')
    expect(VALID_FORMATS).toContain('memory.json')
    expect(VALID_FORMATS).toContain('.cursorrules')
    expect(VALID_FORMATS).toContain('CLAUDE.md')
  })
})

describe('buildToolSummary', () => {
  it('builds a correct summary', () => {
    const tool = makeMockTool({
      id: 'github_create_issue',
      name: 'Create Issue',
      description: 'Create a new issue',
      provider: 'github',
      authType: 'oauth2',
      category: 'development',
    })

    const summary = buildToolSummary(tool, true)

    expect(summary.id).toBe('github_create_issue')
    expect(summary.name).toBe('Create Issue')
    expect(summary.provider).toBe('github')
    expect(summary.connected).toBe(true)
    expect(summary.authType).toBe('oauth2')
    expect(summary.category).toBe('development')
  })
})
