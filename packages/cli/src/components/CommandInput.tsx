import React, { useState, useRef, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { complete, TOP_LEVEL_COMMANDS } from '../lib/completion.js'

interface Props {
  onSubmit: (value: string) => void
  history: string[]
  placeholder?: string
}

export default function CommandInput({ onSubmit, history, placeholder = '' }: Props) {
  const [value, setValue] = useState('')
  const [cursor, setCursor] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState('')
  const ghostRef = useRef('')
  const histIdx = useRef<number>(history.length)
  const completions = useRef<{ list: string[]; idx: number; original: string } | null>(null)

  // Keep histIdx in sync when history list grows externally
  useEffect(() => {
    histIdx.current = history.length
  }, [history.length])

  // Ctrl+R reverse search logic
  useEffect(() => {
    if (!searchMode || !searchQuery) {
      setSearchResult('')
      return
    }
    const q = searchQuery.toLowerCase()
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].toLowerCase().includes(q)) {
        setSearchResult(history[i])
        return
      }
    }
    setSearchResult('')
  }, [searchMode, searchQuery, history])

  useInput((input, key) => {
    // ─── Ctrl+R search mode ──────────────────────────
    if (searchMode) {
      if (key.return) {
        // Accept search result
        const result = searchResult || searchQuery
        setSearchMode(false)
        setSearchQuery('')
        setValue(result)
        setCursor(result.length)
        onSubmit(result)
        return
      }
      if (key.escape || (key.ctrl && input === 'c')) {
        // Cancel search
        setSearchMode(false)
        setSearchQuery('')
        return
      }
      if (key.ctrl && input === 'r') {
        // noop extra Ctrl+R while in search
        return
      }
      if (key.backspace || key.delete) {
        setSearchQuery((q) => q.slice(0, -1))
        return
      }
      if (key.tab) {
        // Accept result into input (don't submit)
        const result = searchResult || searchQuery
        setSearchMode(false)
        setSearchQuery('')
        setValue(result)
        setCursor(result.length)
        return
      }
      if (!key.ctrl && !key.meta && !key.escape && input) {
        setSearchQuery((q) => q + input)
        return
      }
      return
    }

    // ─── Enter Ctrl+R search ────────────────────────
    if (key.ctrl && input === 'r') {
      setSearchMode(true)
      setSearchQuery('')
      return
    }

    // Reset tab completion state on any non-tab input
    if (!key.tab && completions.current) completions.current = null

    if (key.return) {
      const submitted = value
      setValue('')
      setCursor(0)
      setHint(null)
      histIdx.current = history.length + 1
      onSubmit(submitted)
      return
    }

    if (key.tab) {
      if (completions.current) {
        const cs = completions.current
        cs.idx = (cs.idx + 1) % cs.list.length
        const next = cs.list[cs.idx]
        setValue(next)
        setCursor(next.length)
        setHint(
          cs.list.length > 1 ? `${cs.idx + 1}/${cs.list.length} matches — Tab to cycle` : null,
        )
      } else {
        const list = complete(value)
        if (list.length === 0) {
          setHint('no completions')
        } else if (list.length === 1) {
          setValue(list[0])
          setCursor(list[0].length)
          setHint(null)
        } else {
          completions.current = { list, idx: 0, original: value }
          setValue(list[0])
          setCursor(list[0].length)
          setHint(`${list.length} matches — Tab to cycle`)
        }
      }
      return
    }

    if (key.upArrow) {
      if (history.length === 0) return
      const next = Math.max(0, histIdx.current - 1)
      histIdx.current = next
      const v = history[next] ?? ''
      setValue(v)
      setCursor(v.length)
      return
    }

    if (key.downArrow) {
      if (history.length === 0) return
      const next = Math.min(history.length, histIdx.current + 1)
      histIdx.current = next
      const v = next === history.length ? '' : history[next]
      setValue(v)
      setCursor(v.length)
      return
    }

    if (key.leftArrow) {
      setCursor((cur) => Math.max(0, cur - 1))
      return
    }
    if (key.rightArrow) {
      if (cursor >= value.length && ghostRef.current.length > 0) {
        const full = value + ghostRef.current
        setValue(full)
        setCursor(full.length)
        return
      }
      setCursor((cur) => Math.min(value.length, cur + 1))
      return
    }

    if (key.backspace || key.delete) {
      if (cursor === 0) return
      setValue((v) => v.slice(0, cursor - 1) + v.slice(cursor))
      setCursor((cur) => cur - 1)
      setHint(null)
      return
    }

    // Ctrl+L: clear-line
    if (key.ctrl && input === 'l') {
      setValue('')
      setCursor(0)
      return
    }
    // Ctrl+A / Ctrl+E: home / end
    if (key.ctrl && input === 'a') return setCursor(0)
    if (key.ctrl && input === 'e') return setCursor(value.length)
    // Ctrl+U: kill to start of line
    if (key.ctrl && input === 'u') {
      setValue((v) => v.slice(cursor))
      setCursor(0)
      return
    }
    // Ctrl+K: kill to end of line
    if (key.ctrl && input === 'k') {
      setValue((v) => v.slice(0, cursor))
      return
    }
    // Ctrl+W: delete word backwards
    if (key.ctrl && input === 'w') {
      const before = value.slice(0, cursor)
      const trimmed = before.replace(/\s+$/, '')
      const lastSpace = trimmed.lastIndexOf(' ')
      const newCursor = lastSpace === -1 ? 0 : lastSpace + 1
      setValue((v) => v.slice(0, newCursor) + v.slice(cursor))
      setCursor(newCursor)
      return
    }

    if (key.ctrl || key.meta || key.escape) return

    if (input) {
      setValue((v) => v.slice(0, cursor) + input + v.slice(cursor))
      setCursor((cur) => cur + input.length)
      setHint(null)
    }
  })

  // ─── Render: search mode ──────────────────────────
  if (searchMode) {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color="yellow" bold>
            bck-i-search:{' '}
          </Text>
          <Text color="white">{searchQuery}</Text>
          <Text color="cyan" inverse>
            {' '}
          </Text>
        </Box>
        {searchResult && (
          <Box paddingLeft={2}>
            <Text dimColor>→ </Text>
            <Text color="white">{searchResult}</Text>
          </Box>
        )}
        {searchQuery && !searchResult && (
          <Box paddingLeft={2}>
            <Text color="red" dimColor>
              no match
            </Text>
          </Box>
        )}
      </Box>
    )
  }

  // ─── Render: normal mode ──────────────────────────
  const showPlaceholder = value.length === 0
  const before = value.slice(0, cursor)
  const at = value.slice(cursor, cursor + 1) || ' '
  const after = value.slice(cursor + 1)

  // Live ghost-text autocomplete suggestion (single-match prefix)
  let ghost = ''
  if (!showPlaceholder && value.trim().split(/\s+/).length === 1) {
    const matches = TOP_LEVEL_COMMANDS.filter((c) => c.startsWith(value.toLowerCase()))
    if (matches.length === 1 && matches[0] !== value.toLowerCase())
      ghost = matches[0].slice(value.length)
  }
  ghostRef.current = ghost

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>
          ❯{' '}
        </Text>
        {showPlaceholder ? (
          <Text>
            <Text color="cyan" inverse>
              {' '}
            </Text>
            <Text dimColor>{placeholder}</Text>
          </Text>
        ) : (
          <Text>
            <Text color="white">{before}</Text>
            <Text color="cyan" inverse>
              {at}
            </Text>
            <Text color="white">{after}</Text>
            {ghost && <Text dimColor>{ghost}</Text>}
          </Text>
        )}
      </Box>
      {hint && (
        <Box paddingLeft={2}>
          <Text dimColor>↳ {hint}</Text>
        </Box>
      )}
    </Box>
  )
}
