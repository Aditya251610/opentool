import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { loadConfig } from '../lib/config.js';

interface Tool {
  id: string;
  name: string;
  provider: string;
  connected: boolean;
}

const PROVIDER_ICONS: Record<string, string> = {
  github: '  ',
  notion: '  ',
  slack: '  ',
  linear: '  ',
  gmail: '  ',
  gcal: '  ',
  stripe: '  ',
  vercel: '▲  ',
  resend: '  ',
  postgres: '  ',
};

export default function ToolsList() {
  const [tools, setTools] = useState<Tool[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const config = loadConfig();

  useEffect(() => {
    fetchTools();
  }, []);

  async function fetchTools() {
    try {
      // Fetch all tools and connected tools in parallel
      const headers = config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {};
      const [toolsRes, connectedRes] = await Promise.all([
        fetch(`${config.serverUrl}/api/tools`, {
          headers,
          signal: AbortSignal.timeout(10000),
        }),
        config.apiKey
          ? fetch(`${config.serverUrl}/api/tools/connected`, {
              headers,
              signal: AbortSignal.timeout(10000),
            }).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (!toolsRes.ok) throw new Error(`HTTP ${toolsRes.status}`);
      const toolsData = await toolsRes.json();
      const allTools: Tool[] = (toolsData.tools ?? toolsData).map((t: any) => ({
        ...t,
        connected: false,
      }));

      // Merge connected status from /api/tools/connected
      if (connectedRes && connectedRes.ok) {
        const connectedData = await connectedRes.json();
        const connectedProviders = new Set(
          (connectedData.connections ?? connectedData).map((c: any) => c.provider)
        );
        for (const tool of allTools) {
          if (connectedProviders.has(tool.provider)) {
            tool.connected = true;
          }
        }
      }

      setTools(allTools);
    } catch {
      setTools([]);
      setError('Server unreachable — run: status');
    }
  }

  if (tools === null) {
    return (
      <Box paddingX={2}>
        <Text color="yellow"><Spinner type="dots" /></Text>
        <Text dimColor> Loading tools…</Text>
      </Box>
    );
  }

  const connectedCount = tools.filter(t => t.connected).length;

  // Group by provider
  const grouped = new Map<string, Tool[]>();
  for (const t of tools) {
    const arr = grouped.get(t.provider) ?? [];
    arr.push(t);
    grouped.set(t.provider, arr);
  }

  return (
    <Box flexDirection="column" paddingX={2}>
      {error && (
        <Box marginBottom={1}>
          <Text color="yellow">⚠ {error}</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text bold color="white">Available Tools</Text>
        <Text dimColor> ({tools.length} total, </Text>
        <Text color="green">{connectedCount} connected</Text>
        <Text dimColor>)</Text>
      </Box>

      {[...grouped.entries()].map(([provider, providerTools]) => {
        const anyConnected = providerTools.some(t => t.connected);
        return (
          <Box key={provider} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color={anyConnected ? 'green' : 'cyan'}>{PROVIDER_ICONS[provider] ?? '◆  '}</Text>
              <Text bold color="white">{provider.charAt(0).toUpperCase() + provider.slice(1)}</Text>
              {anyConnected && <Text color="green"> ✓</Text>}
            </Box>
            {providerTools.map(t => (
              <Box key={t.id} paddingLeft={4}>
                <Text color={t.connected ? 'green' : 'gray'}>
                  {t.connected ? '●' : '○'}
                </Text>
                <Text color={t.connected ? 'white' : 'gray'}> {t.name}</Text>
              </Box>
            ))}
          </Box>
        );
      })}

      {!config.apiKey && (
        <Box marginTop={1}>
          <Text color="yellow">⚠ Not logged in — run: login {'<email>'} {'<password>'} or set-key {'<api-key>'}</Text>
        </Box>
      )}
    </Box>
  );
}
