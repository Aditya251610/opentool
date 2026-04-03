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
      const res = await fetch(`${config.serverUrl}/api/tools`, {
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTools(data.tools ?? data);
    } catch {
      // Fallback: show built-in providers
      setTools([
        { id: 'github', name: 'GitHub', provider: 'github', connected: false },
        { id: 'notion', name: 'Notion', provider: 'notion', connected: false },
        { id: 'slack', name: 'Slack', provider: 'slack', connected: false },
        { id: 'linear', name: 'Linear', provider: 'linear', connected: false },
        { id: 'gmail', name: 'Gmail', provider: 'gmail', connected: false },
        { id: 'gcal', name: 'Google Calendar', provider: 'gcal', connected: false },
        { id: 'stripe', name: 'Stripe', provider: 'stripe', connected: false },
        { id: 'vercel', name: 'Vercel', provider: 'vercel', connected: false },
        { id: 'resend', name: 'Resend', provider: 'resend', connected: false },
        { id: 'postgres', name: 'PostgreSQL', provider: 'postgres', connected: false },
      ]);
      setError('Server unreachable — showing built-in providers');
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
        <Text dimColor> ({tools.length} total)</Text>
      </Box>

      {[...grouped.entries()].map(([provider, providerTools]) => (
        <Box key={provider} flexDirection="column" marginBottom={1}>
          <Box>
            <Text color="cyan">{PROVIDER_ICONS[provider] ?? '◆  '}</Text>
            <Text bold color="white">{provider.charAt(0).toUpperCase() + provider.slice(1)}</Text>
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
      ))}

      <Box marginTop={1}>
        <Text dimColor>Run </Text>
        <Text color="cyan">connect {'<provider>'}</Text>
        <Text dimColor> to authenticate a tool</Text>
      </Box>
    </Box>
  );
}
