import React from 'react'
import { Box, Text } from 'ink'

const SECTIONS: { title: string; rows: { cmd: string; desc: string }[] }[] = [
  {
    title: '🔐 Auth',
    rows: [
      { cmd: 'login', desc: 'Open browser to log in' },
      { cmd: 'login <email> <pass>', desc: 'Log in directly' },
      { cmd: 'logout', desc: 'Clear saved API key' },
      { cmd: 'set-key <api-key>', desc: 'Manually set an API key' },
    ],
  },
  {
    title: '🔧 Tools',
    rows: [
      { cmd: 'tools', desc: 'List all tools and connection status' },
      { cmd: 'show <tool-id>', desc: 'Show detail for a single tool' },
      { cmd: 'connect <provider>', desc: 'Authenticate a provider via browser' },
      { cmd: 'disconnect <provider>', desc: 'Remove a provider connection' },
      { cmd: 'exec <tool> {args}', desc: 'Run a tool (e.g. exec github.list_repos)' },
      { cmd: 'refresh', desc: 'Refresh tools cache and tab completions' },
    ],
  },
  {
    title: '⚙ Server',
    rows: [
      { cmd: 'set-url <url>', desc: 'Change server URL' },
      { cmd: 'status', desc: 'Check server health and latency' },
      { cmd: 'ping', desc: 'Quick latency check (pong!)' },
      { cmd: 'whoami', desc: 'Show current login info' },
      { cmd: 'keys', desc: 'List your API keys' },
      { cmd: 'config', desc: 'Show current configuration' },
    ],
  },
  {
    title: '🏢 Organizations',
    rows: [
      { cmd: 'org list', desc: 'List your organizations' },
      { cmd: 'org use <slug>', desc: 'Set active org context' },
      { cmd: 'org unset', desc: 'Clear org context' },
      { cmd: 'org info', desc: 'Show current org details' },
      { cmd: 'org members', desc: 'List org members' },
      { cmd: 'org teams', desc: 'List org teams' },
      { cmd: 'org create <name> <slug>', desc: 'Create new org' },
    ],
  },
  {
    title: '📋 Session',
    rows: [
      { cmd: 'history', desc: 'Show recent command history' },
      { cmd: 'clear · Ctrl+L', desc: 'Clear screen' },
      { cmd: 'help · ?', desc: 'Show this help' },
      { cmd: 'exit · q · Ctrl+C', desc: 'Quit' },
    ],
  },
]

const EXAMPLES = [
  { cmd: 'exec github.list_repos {"per_page":3}', desc: 'List 3 repos' },
  { cmd: 'exec gmail.send_email {"to":"me@.."}', desc: 'Send an email' },
  { cmd: 'show postgres.execute_query', desc: 'View tool details' },
]

export default function Help() {
  return (
    <Box flexDirection="column" paddingX={2}>
      <Box marginBottom={1}>
        <Text bold color="white">
          Commands
        </Text>
        <Text dimColor> · also runnable as </Text>
        <Text color="cyan">opentool {'<cmd>'}</Text>
        <Text dimColor> from your shell</Text>
      </Box>
      {SECTIONS.map(({ title, rows }) => (
        <Box key={title} flexDirection="column" marginBottom={1}>
          <Text color="cyan" bold>
            {title}
          </Text>
          {rows.map(({ cmd, desc }) => (
            <Box key={cmd} gap={1}>
              <Box width={28}>
                <Text color="white">{cmd}</Text>
              </Box>
              <Text dimColor>{desc}</Text>
            </Box>
          ))}
        </Box>
      ))}

      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan" bold>
          ⌨ Keyboard
        </Text>
        {[
          ['↑ ↓', 'Navigate command history'],
          ['Tab', 'Autocomplete commands/tools'],
          ['→ (at end)', 'Accept ghost suggestion'],
          ['Ctrl+A / Ctrl+E', 'Jump to start / end of line'],
          ['Ctrl+U / Ctrl+K', 'Kill to start / end of line'],
          ['Ctrl+W', 'Delete word backwards'],
          ['Ctrl+R', 'Reverse search command history'],
          ['Ctrl+C / Ctrl+D', 'Exit'],
        ].map(([key, desc]) => (
          <Box key={key} gap={1}>
            <Box width={28}>
              <Text color="white">{key}</Text>
            </Box>
            <Text dimColor>{desc}</Text>
          </Box>
        ))}
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan" bold>
          📝 Examples
        </Text>
        {EXAMPLES.map(({ cmd, desc }) => (
          <Box key={cmd} gap={1}>
            <Box width={44}>
              <Text color="gray">{cmd}</Text>
            </Box>
            <Text dimColor>{desc}</Text>
          </Box>
        ))}
      </Box>

      <Box flexDirection="column">
        <Text dimColor>💡 Tips</Text>
        <Text dimColor>
          {' '}
          · Pipe JSON args: echo '{'{"per_page":5}'}' | opentool exec github.list_repos
        </Text>
        <Text dimColor> · Machine output: opentool tools --json | jq</Text>
        <Text dimColor> · Diagnose issues: opentool doctor</Text>
        <Text dimColor> · Shell completions: opentool completion --install</Text>
      </Box>
    </Box>
  )
}
