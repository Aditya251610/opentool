import React, { useState, useEffect, useRef, memo } from 'react'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import { loadConfig, checkServerHealth } from '../lib/config.js'

const POLL_INTERVAL = 30_000

interface Props {
  cmdCount: number
  startTime: number
}

function formatUptime(ms: number): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  return `${hr}h${min % 60}m`
}

function StatusBarInner({ cmdCount, startTime }: Props) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [latency, setLatency] = useState<number | null>(null)
  const config = loadConfig()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let mounted = true
    const check = async () => {
      const start = Date.now()
      const ok = await checkServerHealth(config.serverUrl)
      if (!mounted) return
      setLatency(Date.now() - start)
      setStatus(ok ? 'connected' : 'disconnected')
    }
    check()
    timerRef.current = setInterval(check, POLL_INTERVAL)
    return () => {
      mounted = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [config.serverUrl])

  const authLabel = config.apiKey ? (
    <Text color="green"> · authenticated</Text>
  ) : (
    <Text color="yellow"> · not logged in</Text>
  )

  const uptime = formatUptime(Date.now() - startTime)
  const sessionInfo =
    cmdCount > 0 ? (
      <Text dimColor>
        {' '}
        · {cmdCount} cmd{cmdCount === 1 ? '' : 's'} · {uptime}
      </Text>
    ) : (
      <Text dimColor> · {uptime}</Text>
    )

  return (
    <Box paddingX={2} marginBottom={1}>
      {status === 'checking' && (
        <>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text dimColor> Connecting to {config.serverUrl}…</Text>
        </>
      )}
      {status === 'connected' && (
        <>
          <Text color="green">●</Text>
          <Text dimColor> </Text>
          <Text color="cyan">{config.serverUrl}</Text>
          {latency !== null && <Text dimColor> ({latency}ms)</Text>}
          {authLabel}
          {sessionInfo}
        </>
      )}
      {status === 'disconnected' && (
        <>
          <Text color="red">●</Text>
          <Text dimColor> </Text>
          <Text color="red">{config.serverUrl}</Text>
          <Text dimColor> — offline · </Text>
          <Text color="cyan">docker compose up</Text>
          <Text dimColor> to start</Text>
          {sessionInfo}
        </>
      )}
    </Box>
  )
}

export default memo(StatusBarInner)
