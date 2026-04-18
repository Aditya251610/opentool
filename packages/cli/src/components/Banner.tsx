import React from 'react'
import { Box, Text } from 'ink'
import { getVersion } from '../lib/version.js'
import { pickTagline } from '../lib/tagline.js'

// ASCII art — 5-line gradient logo
const LOGO_WIDE = [
  '  ██████  ██████  ███████ ███    ██ ████████  ██████   ██████  ██',
  ' ██    ██ ██   ██ ██      ████   ██    ██    ██    ██ ██    ██ ██',
  ' ██    ██ ██████  █████   ██ ██  ██    ██    ██    ██ ██    ██ ██',
  ' ██    ██ ██      ██      ██  ██ ██    ██    ██    ██ ██    ██ ██',
  '  ██████  ██      ███████ ██   ████    ██     ██████   ██████  ███████',
]

const LOGO_COMPACT = [
  '╔═══╗╔═══╗╔═══╗╔╗╔╗╔════╗╔═══╗╔═══╗╔╗',
  '║   ║║   ║║    ║╚║║  ║║  ║   ║║   ║║║',
  '║   ║╠═══╝╠═══ ║ ╚║  ║║  ║   ║║   ║║║',
  '╚═══╝║    ╚═══╝║  ╚  ║║  ╚═══╝╚═══╝╚╝',
]

const COLORS_WIDE = ['cyan', 'cyan', 'cyanBright', 'cyanBright', 'blue'] as const
const COLORS_COMPACT = ['cyan', 'cyanBright', 'cyanBright', 'blue'] as const

function pad(s: string, w: number) {
  return s + ' '.repeat(Math.max(0, w - s.length))
}

export default function Banner() {
  const cols = process.stdout.columns ?? 80
  const W = Math.min(Math.max(cols - 4, 44), 72)
  const version = `v${getVersion()}`
  const tagline = pickTagline()

  const useWide = cols >= 72
  const logo = useWide ? LOGO_WIDE : cols >= 48 ? LOGO_COMPACT : null
  const colorMap = useWide ? COLORS_WIDE : COLORS_COMPACT

  return (
    <Box flexDirection="column" paddingX={1} marginTop={1}>
      <Text color="gray">
        {'╭─ '}
        <Text color="red">●</Text> <Text color="yellow">●</Text> <Text color="green">●</Text>{' '}
        {'─'.repeat(Math.max(0, W - 8))}
        {'╮'}
      </Text>
      <Text color="gray">
        {'│'}
        {' '.repeat(W)}
        {'│'}
      </Text>

      {logo ? (
        logo.map((line, i) => (
          <Text key={i} color="gray">
            {'│ '}
            <Text color={colorMap[i % colorMap.length]}>{pad(line, W - 2)}</Text>
            {'│'}
          </Text>
        ))
      ) : (
        <Text color="gray">
          {'│ '}
          <Text color="cyanBright" bold>
            {pad('⚡ OPENTOOL', W - 2)}
          </Text>
          {'│'}
        </Text>
      )}

      <Text color="gray">
        {'│'}
        {' '.repeat(W)}
        {'│'}
      </Text>

      {/* Version + random tagline */}
      <Text color="gray">
        {'│ '}
        <Text color="cyanBright" bold>
          {version}
        </Text>
        <Text dimColor>{' · '}</Text>
        <Text color="white">{pad(tagline, Math.max(0, W - version.length - 5))}</Text>
        {'│'}
      </Text>

      <Text color="gray">
        {'│ '}
        <Text dimColor>{pad('help · ↑↓ history · Tab complete · Ctrl+R search', W - 2)}</Text>
        {'│'}
      </Text>
      <Text color="gray">
        {'╰'}
        {'─'.repeat(W)}
        {'╯'}
      </Text>
    </Box>
  )
}
