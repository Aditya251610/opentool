import React from 'react';
import { Box, Text } from 'ink';

const W = 56; // inner width of terminal frame

const PIXEL_ART = [
  ' ███   ████  █████ █   █ █████  ███   ███  █',
  '█   █ █   █ █     ██  █   █   █   █ █   █ █',
  '█   █ █   █ █     █ █ █   █   █   █ █   █ █',
  '█   █ ████  ███   █  ██   █   █   █ █   █ █',
  '█   █ █     █     █   █   █   █   █ █   █ █',
  '█   █ █     █     █   █   █   █   █ █   █ █',
  ' ███  █     █████ █   █   █    ███   ███  █████',
];

function pad(s: string, w: number) {
  return s + ' '.repeat(Math.max(0, w - s.length));
}

export default function Banner() {
  const tagline = 'v0.0.1 · One MCP server. All your tools.';
  return (
    <Box flexDirection="column" paddingX={1} marginTop={1}>
      <Text color="gray">{'╭─ '}<Text color="red">●</Text>{' '}<Text color="yellow">●</Text>{' '}<Text color="green">●</Text>{' '}{'─'.repeat(W - 8)}{'╮'}</Text>
      <Text color="gray">{'│'}{' '.repeat(W)}{'│'}</Text>
      {PIXEL_ART.map((line, i) => (
        <Text key={i} color="gray">{'│ '}<Text color="cyan">{pad(line, W - 2)}</Text>{'│'}</Text>
      ))}
      <Text color="gray">{'│'}{' '.repeat(W)}{'│'}</Text>
      <Text color="gray">{'│ '}<Text dimColor>{pad(tagline, W - 2)}</Text>{'│'}</Text>
      <Text color="gray">{'╰'}{'─'.repeat(W)}{'╯'}</Text>
    </Box>
  );
}
