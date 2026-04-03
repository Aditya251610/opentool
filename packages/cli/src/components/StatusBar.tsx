import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { loadConfig, checkServerHealth } from '../lib/config.js';

export default function StatusBar() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const config = loadConfig();

  useEffect(() => {
    checkServerHealth(config.serverUrl).then(ok => {
      setStatus(ok ? 'connected' : 'disconnected');
    });
  }, []);

  return (
    <Box paddingX={2} marginBottom={1}>
      {status === 'checking' && (
        <>
          <Text color="yellow"><Spinner type="dots" /></Text>
          <Text dimColor> Connecting to {config.serverUrl}…</Text>
        </>
      )}
      {status === 'connected' && (
        <>
          <Text color="green">●</Text>
          <Text dimColor> Connected to </Text>
          <Text color="cyan">{config.serverUrl}</Text>
        </>
      )}
      {status === 'disconnected' && (
        <>
          <Text color="red">●</Text>
          <Text dimColor> Server offline — </Text>
          <Text color="gray">run </Text>
          <Text color="cyan">docker compose up</Text>
          <Text color="gray"> to start</Text>
        </>
      )}
    </Box>
  );
}
