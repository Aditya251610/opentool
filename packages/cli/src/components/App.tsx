import React, { useState, useCallback } from 'react';
import { Box, Text, Static, useApp } from 'ink';
import Banner from './Banner.js';
import StatusBar from './StatusBar.js';
import ToolsList from './ToolsList.js';
import Help from './Help.js';
import CommandInput from './CommandInput.js';
import { loadConfig, checkServerHealth } from '../lib/config.js';

type View = 'prompt' | 'tools' | 'help' | 'status' | 'config';

export default function App() {
  const { exit } = useApp();
  const [view, setView] = useState<View>('prompt');
  const [message, setMessage] = useState<string | null>(null);
  const [messageColor, setMessageColor] = useState<string>('gray');

  const showMessage = useCallback((msg: string, color = 'gray') => {
    setMessage(msg);
    setMessageColor(color);
  }, []);

  const handleSubmit = useCallback((value: string) => {
    const cmd = value.trim().toLowerCase();
    if (!cmd) return;

    setMessage(null);

    switch (cmd) {
      case 'tools':
      case 'ls':
        setView('tools');
        break;
      case 'help':
      case '?':
        setView('help');
        break;
      case 'status':
        setView('status');
        break;
      case 'config':
        setView('config');
        break;
      case 'clear':
        setView('prompt');
        setMessage(null);
        break;
      case 'exit':
      case 'quit':
      case 'q':
        exit();
        return;
      default:
        if (cmd.startsWith('connect ')) {
          const provider = cmd.slice(8).trim();
          if (!provider) {
            showMessage('Usage: connect <provider>', 'yellow');
          } else {
            const config = loadConfig();
            showMessage(`Opening browser for ${provider} auth…`, 'cyan');
            const url = `${config.serverUrl}/api/auth/${provider}`;
            import('node:child_process').then(({ exec }) => {
              const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
              exec(`${openCmd} "${url}"`);
            }).catch(() => {
              showMessage(`Visit: ${url}`, 'cyan');
            });
          }
        } else if (cmd.startsWith('disconnect ')) {
          const provider = cmd.slice(11).trim();
          showMessage(`Disconnected ${provider}`, 'green');
        } else {
          showMessage(`Unknown command: ${cmd}. Type help for commands.`, 'yellow');
        }
        break;
    }
  }, [exit, showMessage]);

  return (
    <Box flexDirection="column">
      <Static items={['banner']}>
        {() => <Banner key="banner" />}
      </Static>

      <StatusBar />

      {view === 'tools' && <ToolsList />}
      {view === 'help' && <Help />}
      {view === 'status' && <StatusView />}
      {view === 'config' && <ConfigView />}

      {message && (
        <Box paddingX={2} marginBottom={1}>
          <Text color={messageColor}>{message}</Text>
        </Box>
      )}

      <Box paddingX={1}>
        <CommandInput
          onSubmit={handleSubmit}
          placeholder="Type a command… (help for list)"
        />
      </Box>
    </Box>
  );
}

function StatusView() {
  const [status, setStatus] = useState<string>('Checking…');
  const config = loadConfig();

  React.useEffect(() => {
    checkServerHealth(config.serverUrl).then(ok => {
      setStatus(ok
        ? `✓ Server is healthy at ${config.serverUrl}`
        : `✗ Server unreachable at ${config.serverUrl}`);
    });
  }, []);

  return (
    <Box paddingX={2} marginBottom={1}>
      <Text color={status.startsWith('✓') ? 'green' : 'red'}>{status}</Text>
    </Box>
  );
}

function ConfigView() {
  const config = loadConfig();
  return (
    <Box flexDirection="column" paddingX={2} marginBottom={1}>
      <Box marginBottom={1}>
        <Text bold color="white">Configuration</Text>
      </Box>
      <Box gap={1}>
        <Text color="gray">Server URL:</Text>
        <Text color="cyan">{config.serverUrl}</Text>
      </Box>
      <Box gap={1}>
        <Text color="gray">API Key:   </Text>
        <Text color={config.apiKey ? 'green' : 'yellow'}>
          {config.apiKey ? `${config.apiKey.slice(0, 8)}…` : 'Not set'}
        </Text>
      </Box>
    </Box>
  );
}
