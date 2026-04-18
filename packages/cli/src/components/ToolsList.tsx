import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import { loadConfig } from '../lib/config.js'
import {
  endpoints,
  unwrapConnections,
  unwrapTools,
  type Tool,
  type Connection,
} from '../lib/api.js'

const PROVIDER_ICONS: Record<string, string> = {
  github: '  ',
  notion: '  ',
  slack: '  ',
  linear: '  ',
  gmail: '  ',
  gcal: '  ',
  stripe: '  ',
  vercel: '▲ ',
  resend: '  ',
  postgres: '  ',
}

interface ToolWithStatus extends Tool {
  connected: boolean
}

export default function ToolsList() {
  const [tools, setTools] = useState<ToolWithStatus[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const config = loadConfig()

  useEffect(() => {
    fetchTools()
  }, [])

  async function fetchTools() {
    try {
      const [toolsRes, connectedRes] = await Promise.all([
        endpoints.tools(),
        config.apiKey
          ? endpoints.connections().catch((): Connection[] => [])
          : Promise.resolve([] as Connection[]),
      ])
      const allTools = unwrapTools(toolsRes)
      const connList = Array.isArray(connectedRes) ? connectedRes : unwrapConnections(connectedRes)
      const connectedSet = new Set(connList.map((c) => c.provider))
      setTools(allTools.map((t) => ({ ...t, connected: connectedSet.has(t.provider) })))
    } catch (err) {
      setTools([])
      setError(`Server unreachable — ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  if (tools === null) {
    return (
      <Box paddingX={2}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text dimColor> Loading tools…</Text>
      </Box>
    )
  }

  const connectedCount = new Set(tools.filter((t) => t.connected).map((t) => t.provider)).size

  // Group by provider
  const grouped = new Map<string, ToolWithStatus[]>()
  for (const t of tools) {
    const arr = grouped.get(t.provider) ?? []
    arr.push(t)
    grouped.set(t.provider, arr)
  }

  return (
    <Box flexDirection="column" paddingX={2}>
      {error && (
        <Box marginBottom={1}>
          <Text color="yellow">⚠ {error}</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text bold color="white">
          Available Tools
        </Text>
        <Text dimColor> ({tools.length} total · </Text>
        <Text color="green">{connectedCount} connected</Text>
        <Text dimColor>)</Text>
      </Box>

      {[...grouped.entries()].map(([provider, providerTools]) => {
        const anyConnected = providerTools.some((t) => t.connected)
        return (
          <Box key={provider} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color={anyConnected ? 'green' : 'cyan'}>
                {PROVIDER_ICONS[provider] ?? '◆ '}
              </Text>
              <Text bold color="white">
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </Text>
              {anyConnected && <Text color="green"> ✓</Text>}
              <Text dimColor> ({providerTools.length})</Text>
            </Box>
            {providerTools.map((t) => (
              <Box key={t.id} paddingLeft={4}>
                <Text color={t.connected ? 'green' : 'gray'}>{t.connected ? '●' : '○'}</Text>
                <Text color={t.connected ? 'white' : 'gray'}> {t.name}</Text>
                <Text dimColor> {t.id}</Text>
              </Box>
            ))}
          </Box>
        )
      })}

      {!config.apiKey && (
        <Box marginTop={1}>
          <Text color="yellow">⚠ Not logged in — connection status hidden. Run: login</Text>
        </Box>
      )}
    </Box>
  )
}
