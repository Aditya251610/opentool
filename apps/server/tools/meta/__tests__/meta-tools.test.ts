import { describe, it, expect } from 'vitest'
import { searchToolsMeta, getToolDetailsMeta, executeDynamicToolMeta, metaTools } from '../index'
import { getAllTools, getMetaTools, getUserTools, getToolById } from '../../../src/registry'

describe('meta-tools', () => {
  describe('tool definitions', () => {
    it('exports exactly 3 meta-tools', () => {
      expect(metaTools).toHaveLength(3)
    })

    it('all meta-tools have provider "meta"', () => {
      for (const tool of metaTools) {
        expect(tool.provider).toBe('meta')
      }
    })

    it('all meta-tool IDs start with "meta_"', () => {
      for (const tool of metaTools) {
        expect(tool.id.startsWith('meta_')).toBe(true)
      }
    })

    it('search_tools has readOnlyHint', () => {
      expect(searchToolsMeta.annotations.readOnlyHint).toBe(true)
      expect(searchToolsMeta.annotations.destructiveHint).toBe(false)
    })

    it('get_tool_details has readOnlyHint', () => {
      expect(getToolDetailsMeta.annotations.readOnlyHint).toBe(true)
      expect(getToolDetailsMeta.annotations.destructiveHint).toBe(false)
    })

    it('execute_dynamic_tool has destructiveHint', () => {
      expect(executeDynamicToolMeta.annotations.destructiveHint).toBe(true)
      expect(executeDynamicToolMeta.annotations.readOnlyHint).toBe(false)
    })

    it('meta-tools have category "meta"', () => {
      for (const tool of metaTools) {
        expect(tool.category).toBe('meta')
      }
    })
  })

  describe('registry integration', () => {
    it('meta-tools are in the registry', () => {
      const all = getAllTools()
      const metaIds = metaTools.map((t) => t.id)
      for (const id of metaIds) {
        expect(all.find((t) => t.id === id)).toBeDefined()
      }
    })

    it('getMetaTools returns only meta-tools', () => {
      const meta = getMetaTools()
      expect(meta).toHaveLength(3)
      expect(meta.every((t) => t.provider === 'meta')).toBe(true)
    })

    it('getUserTools excludes meta-tools', () => {
      const userTools = getUserTools()
      expect(userTools.every((t) => t.provider !== 'meta')).toBe(true)
    })

    it('meta-tools are findable by ID', () => {
      expect(getToolById('meta_search_tools')).toBeDefined()
      expect(getToolById('meta_get_tool_details')).toBeDefined()
      expect(getToolById('meta_execute_dynamic_tool')).toBeDefined()
    })
  })

  describe('meta_search_tools execute', () => {
    const auth = { userId: 'test-user' }

    it('returns provider summary when no filters', async () => {
      const result = (await searchToolsMeta.execute({
        input: {},
        auth,
      })) as any
      expect(result.providers).toBeDefined()
      expect(result.totalTools).toBeGreaterThan(0)
    })

    it('returns tools when query provided', async () => {
      const result = (await searchToolsMeta.execute({
        input: { query: 'github' },
        auth,
      })) as any
      expect(result.tools).toBeDefined()
      expect(result.tools.length).toBeGreaterThan(0)
    })

    it('returns tools when provider filter provided', async () => {
      const result = (await searchToolsMeta.execute({
        input: { provider: 'slack' },
        auth,
      })) as any
      expect(result.tools).toBeDefined()
      expect(result.tools.every((t: any) => t.provider === 'slack')).toBe(true)
    })

    it('returns tools when category filter provided', async () => {
      const result = (await searchToolsMeta.execute({
        input: { category: 'email' },
        auth,
      })) as any
      expect(result.tools).toBeDefined()
      expect(result.tools.every((t: any) => t.category === 'email')).toBe(true)
    })
  })

  describe('meta_get_tool_details execute', () => {
    const auth = { userId: 'test-user' }

    it('returns full details for valid tool ID', async () => {
      const result = (await getToolDetailsMeta.execute({
        input: { tool_id: 'github_create_issue' },
        auth,
      })) as any
      expect(result.id).toBe('github_create_issue')
      expect(result.name).toBeDefined()
      expect(result.inputSchema).toBeDefined()
      expect(result.annotations).toBeDefined()
      expect(result.provider).toBe('github')
    })

    it('returns error for invalid tool ID', async () => {
      const result = (await getToolDetailsMeta.execute({
        input: { tool_id: 'nonexistent_tool' },
        auth,
      })) as any
      expect(result.error).toBeDefined()
      expect(result.suggestion).toBeDefined()
    })

    it('includes category in details', async () => {
      const result = (await getToolDetailsMeta.execute({
        input: { tool_id: 'github_create_issue' },
        auth,
      })) as any
      expect(result.category).toBe('development')
    })
  })

  describe('meta_execute_dynamic_tool', () => {
    it('has correct input schema fields', () => {
      const schema = executeDynamicToolMeta.inputJsonSchema
      expect(schema).toBeDefined()
      const props = (schema as any).properties
      expect(props.tool_id).toBeDefined()
      expect(props.arguments).toBeDefined()
    })

    // Note: actual execution requires DB/auth setup — tested in integration tests
  })
})
