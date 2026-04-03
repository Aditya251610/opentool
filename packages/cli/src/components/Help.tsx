import React from 'react';
import { Box, Text } from 'ink';

const COMMANDS = [
  { cmd: 'tools', desc: 'List all available tool providers and status' },
  { cmd: 'connect <provider>', desc: 'Authenticate a tool provider (opens browser)' },
  { cmd: 'disconnect <provider>', desc: 'Remove a tool connection' },
  { cmd: 'status', desc: 'Check server connection health' },
  { cmd: 'config', desc: 'Show current configuration' },
  { cmd: 'help', desc: 'Show this help message' },
  { cmd: 'clear', desc: 'Clear the screen' },
  { cmd: 'exit', desc: 'Quit OpenTool CLI' },
];

export default function Help() {
  return (
    <Box flexDirection="column" paddingX={2}>
      <Box marginBottom={1}>
        <Text bold color="white">Commands</Text>
      </Box>
      {COMMANDS.map(({ cmd, desc }) => (
        <Box key={cmd} gap={1}>
          <Box width={28}>
            <Text color="cyan">{cmd}</Text>
          </Box>
          <Text dimColor>{desc}</Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor>Press </Text>
        <Text color="cyan">Tab</Text>
        <Text dimColor> for autocomplete · </Text>
        <Text color="cyan">Ctrl+C</Text>
        <Text dimColor> to exit</Text>
      </Box>
    </Box>
  );
}
