import { describe, it, expect } from 'vitest'
import { getToolById, getToolsByProvider, getAllTools, getToolIds } from '../index'

describe('tool registry', () => {
  describe('getAllTools', () => {
    it('returns a non-empty array', () => {
      const tools = getAllTools()
      expect(Array.isArray(tools)).toBe(true)
      expect(tools.length).toBeGreaterThan(0)
    })

    it('every tool has required fields', () => {
      for (const tool of getAllTools()) {
        expect(tool.id).toBeDefined()
        expect(typeof tool.id).toBe('string')
        expect(tool.provider).toBeDefined()
        expect(typeof tool.provider).toBe('string')
        expect(tool.description).toBeDefined()
      }
    })
  })

  describe('getToolIds', () => {
    it('returns array of strings', () => {
      const ids = getToolIds()
      expect(ids.length).toBeGreaterThan(0)
      ids.forEach((id) => expect(typeof id).toBe('string'))
    })

    it('has no duplicates', () => {
      const ids = getToolIds()
      const unique = new Set(ids)
      expect(unique.size).toBe(ids.length)
    })
  })

  describe('getToolById', () => {
    it('returns a tool for known ID', () => {
      const ids = getToolIds()
      const tool = getToolById(ids[0])
      expect(tool).toBeDefined()
      expect(tool!.id).toBe(ids[0])
    })

    it('returns undefined for unknown ID', () => {
      expect(getToolById('nonexistent_tool_xyz')).toBeUndefined()
    })
  })

  describe('getToolsByProvider', () => {
    it('returns tools for known providers', () => {
      const providers = [
        'github',
        'slack',
        'gmail',
        'notion',
        'linear',
        'stripe',
        'gcal',
        'vercel',
        'resend',
        'postgres',
      ]
      for (const provider of providers) {
        const tools = getToolsByProvider(provider)
        expect(tools.length).toBeGreaterThan(0)
        tools.forEach((t) => expect(t.provider).toBe(provider))
      }
    })

    it('returns empty array for unknown provider', () => {
      expect(getToolsByProvider('nonexistent')).toEqual([])
    })
  })

  describe('tool id format', () => {
    it('all tool IDs follow provider_action pattern', () => {
      for (const tool of getAllTools()) {
        expect(tool.id).toMatch(/^[a-z]+_[a-z_]+$/)
      }
    })

    it('tool IDs start with their provider prefix', () => {
      for (const tool of getAllTools()) {
        expect(tool.id.startsWith(tool.provider + '_')).toBe(true)
      }
    })
  })
})
