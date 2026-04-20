#!/usr/bin/env node
/**
 * Master generation script for @opentool/proto.
 *
 * Generates client stubs for all supported languages.
 *
 * Usage:
 *   pnpm proto:gen                  # Generate all (TS + Python)
 *   pnpm proto:gen -- --lang ts     # TypeScript only
 *   pnpm proto:gen -- --lang python # Python only
 */

import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const lang = process.argv.includes('--lang')
  ? process.argv[process.argv.indexOf('--lang') + 1]
  : 'all'

console.log('🔧 OpenTool Proto Generation')
console.log('============================\n')

const generators = {
  ts: () => {
    console.log('→ Generating TypeScript types...\n')
    execSync(`node ${join(__dirname, 'generate-ts.mjs')}`, { stdio: 'inherit' })
  },
  python: () => {
    console.log('→ Generating Python stubs...\n')
    try {
      execSync(`python3 ${join(__dirname, 'generate-python.py')}`, { stdio: 'inherit' })
    } catch {
      console.log('⚠  Python generation skipped (grpcio-tools not installed)')
      console.log('   Install with: pip install grpcio-tools\n')
    }
  },
}

if (lang === 'all') {
  for (const [name, gen] of Object.entries(generators)) {
    console.log(`\n${'─'.repeat(40)}`)
    console.log(`Language: ${name}`)
    console.log(`${'─'.repeat(40)}\n`)
    gen()
  }
} else if (generators[lang]) {
  generators[lang]()
} else {
  console.error(`Unknown language: ${lang}. Supported: ${Object.keys(generators).join(', ')}`)
  process.exit(1)
}

console.log('\n✨ Generation complete!')
