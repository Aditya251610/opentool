import React, { useState, useCallback } from 'react';
import { Box, Text, Static, useApp } from 'ink';
import Banner from './Banner.js';
import StatusBar from './StatusBar.js';
import ToolsList from './ToolsList.js';
import Help from './Help.js';
import CommandInput from './CommandInput.js';
import { loadConfig, saveConfig, checkServerHealth } from '../lib/config.js';

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

  const authHeaders = useCallback(() => {
    const config = loadConfig();
    if (!config.apiKey) return {};
    return { Authorization: `Bearer ${config.apiKey}` };
  }, []);

  const handleSubmit = useCallback(async (value: string) => {
    const cmd = value.trim();
    const cmdLower = cmd.toLowerCase();
    if (!cmd) return;

    setMessage(null);

    switch (cmdLower) {
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
        // ─── login (browser) or login <email> <password> ───
        if (cmdLower === 'login') {
          const config = loadConfig();
          const dashUrl = config.serverUrl.replace(':3001', ':3000');
          const loginUrl = `${dashUrl}/login?cli=true`;
          try {
            const { exec } = await import('node:child_process');
            const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
            exec(`${openCmd} "${loginUrl}"`);
          } catch {}
          showMessage(`🔗 Log in via browser — Ctrl+Click to open:\n\n  ${loginUrl}\n\nAfter logging in, copy your API key from the dashboard and run:\n  set-key <your-api-key>\n\nOr login directly: login <email> <password>`, 'cyan');
          break;
        }
        if (cmdLower.startsWith('login ')) {
          const parts = cmd.slice(6).trim().split(/\s+/);
          if (parts.length < 2) {
            showMessage('Usage: login <email> <password>\n  Or just type: login (opens browser)', 'yellow');
            break;
          }
          const [email, password] = parts;
          const config = loadConfig();
          showMessage('Logging in…', 'cyan');
          try {
            const res = await fetch(`${config.serverUrl}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
              showMessage(`Login failed: ${data.error || res.statusText}`, 'red');
              break;
            }
            saveConfig({ ...config, apiKey: data.apiKey });
            showMessage(`✓ Logged in as ${data.user.email}. API key saved to ~/.opentool/config.json\n  Tools connected on the dashboard are already available here.`, 'green');
          } catch (err) {
            showMessage(`Login failed: ${err instanceof Error ? err.message : 'Network error'}`, 'red');
          }
          break;
        }

        // ─── set-key <key> ───
        if (cmdLower.startsWith('set-key ')) {
          const key = cmd.slice(8).trim();
          if (!key) {
            showMessage('Usage: set-key <api-key>', 'yellow');
            break;
          }
          const config = loadConfig();
          saveConfig({ ...config, apiKey: key });
          showMessage(`✓ API key saved (${key.slice(0, 11)}…)`, 'green');
          break;
        }

        // ─── set-url <url> ───
        if (cmdLower.startsWith('set-url ')) {
          const url = cmd.slice(8).trim();
          if (!url) {
            showMessage('Usage: set-url <server-url>', 'yellow');
            break;
          }
          const config = loadConfig();
          saveConfig({ ...config, serverUrl: url });
          showMessage(`✓ Server URL set to ${url}`, 'green');
          break;
        }

        // ─── connect <provider> ───
        if (cmdLower.startsWith('connect ')) {
          const provider = cmd.slice(8).trim().toLowerCase();
          if (!provider) {
            showMessage('Usage: connect <provider>', 'yellow');
            break;
          }
          const config = loadConfig();
          if (!config.apiKey) {
            showMessage('Not authenticated. Run: login <email> <password>', 'yellow');
            break;
          }
          showMessage(`Fetching auth URL for ${provider}…`, 'cyan');
          try {
            const res = await fetch(`${config.serverUrl}/api/auth/connect-url/${provider}`, {
              headers: authHeaders(),
            });
            const data = await res.json();
            if (!res.ok) {
              showMessage(`Connect failed: ${data.error || res.statusText}`, 'red');
              break;
            }
            // Try to open browser, but always show the URL for Ctrl+Click
            try {
              const { exec } = await import('node:child_process');
              const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
              exec(`${openCmd} "${data.url}"`);
            } catch {}
            showMessage(`🔗 Authenticate ${provider} — Ctrl+Click to open:\n\n  ${data.url}\n\nAfter authorizing, run 'tools' to verify.`, 'cyan');
          } catch (err) {
            showMessage(`Connect failed: ${err instanceof Error ? err.message : 'Network error'}`, 'red');
          }
          break;
        }

        // ─── disconnect <provider> ───
        if (cmdLower.startsWith('disconnect ')) {
          const provider = cmd.slice(11).trim().toLowerCase();
          if (!provider) {
            showMessage('Usage: disconnect <provider>', 'yellow');
            break;
          }
          const config = loadConfig();
          if (!config.apiKey) {
            showMessage('Not authenticated. Run: login <email> <password>', 'yellow');
            break;
          }
          showMessage(`Disconnecting ${provider}…`, 'cyan');
          try {
            const res = await fetch(`${config.serverUrl}/api/auth/revoke/${provider}`, {
              method: 'DELETE',
              headers: authHeaders(),
            });
            if (!res.ok) {
              const data = await res.json();
              showMessage(`Disconnect failed: ${data.error || res.statusText}`, 'red');
              break;
            }
            showMessage(`✓ Disconnected ${provider}`, 'green');
          } catch (err) {
            showMessage(`Disconnect failed: ${err instanceof Error ? err.message : 'Network error'}`, 'red');
          }
          break;
        }

        // ─── execute <tool-id> [json-args] ───
        if (cmdLower.startsWith('execute ') || cmdLower.startsWith('run ')) {
          const rest = cmd.slice(cmd.indexOf(' ') + 1).trim();
          const spaceIdx = rest.indexOf(' ');
          const toolId = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx);
          const argsStr = spaceIdx === -1 ? '{}' : rest.slice(spaceIdx + 1).trim();

          if (!toolId) {
            showMessage('Usage: execute <tool-id> [json-args]', 'yellow');
            break;
          }

          const config = loadConfig();
          if (!config.apiKey) {
            showMessage('Not authenticated. Run: login <email> <password>', 'yellow');
            break;
          }

          let args: Record<string, unknown>;
          try {
            args = JSON.parse(argsStr);
          } catch {
            showMessage('Invalid JSON arguments. Example: execute github.list_repos {"per_page": 5}', 'red');
            break;
          }

          showMessage(`Executing ${toolId}…`, 'cyan');
          try {
            const res = await fetch(`${config.serverUrl}/api/tools/execute`, {
              method: 'POST',
              headers: { ...authHeaders(), 'Content-Type': 'application/json' },
              body: JSON.stringify({ toolId, args }),
            });
            const data = await res.json();
            if (!res.ok) {
              showMessage(`Execute failed: ${data.error || res.statusText}`, 'red');
              break;
            }
            showMessage(`✓ Result:\n${JSON.stringify(data.result ?? data, null, 2)}`, 'green');
          } catch (err) {
            showMessage(`Execute failed: ${err instanceof Error ? err.message : 'Network error'}`, 'red');
          }
          break;
        }

        // ─── keys ───
        if (cmdLower === 'keys') {
          const config = loadConfig();
          if (!config.apiKey) {
            showMessage('Not authenticated. Run: login <email> <password>', 'yellow');
            break;
          }
          showMessage('Loading keys…', 'cyan');
          try {
            const res = await fetch(`${config.serverUrl}/api/keys`, {
              headers: authHeaders(),
            });
            const data = await res.json();
            if (!res.ok) {
              showMessage(`Failed: ${data.error || res.statusText}`, 'red');
              break;
            }
            const keys = data.keys ?? data;
            const lines = keys.map((k: any) =>
              `  ${k.keyPrefix}… — ${k.name} (${k.revokedAt ? 'revoked' : 'active'})`
            ).join('\n');
            showMessage(`API Keys:\n${lines || '  No keys found'}`, 'white');
          } catch (err) {
            showMessage(`Failed: ${err instanceof Error ? err.message : 'Network error'}`, 'red');
          }
          break;
        }

        showMessage(`Unknown command: ${cmd}. Type help for commands.`, 'yellow');
        break;
    }
  }, [exit, showMessage, authHeaders]);

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
          {config.apiKey ? `${config.apiKey.slice(0, 11)}…` : 'Not set — run: login <email> <password>'}
        </Text>
      </Box>
    </Box>
  );
}
