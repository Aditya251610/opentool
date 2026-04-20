#!/usr/bin/env node
/**
 * TypeScript generation script for @opentool/proto.
 *
 * This uses @grpc/proto-loader for dynamic loading (no protoc required).
 * The TypeScript types are maintained manually in src/index.ts to match the proto definitions.
 *
 * For static code generation (optional, for editor autocomplete):
 *   npx proto-loader-gen-types \
 *     --longs=String --enums=String --defaults --oneofs \
 *     --grpcLib=@grpc/grpc-js \
 *     -I packages/proto \
 *     -O packages/proto/src/generated \
 *     packages/proto/opentool/v1/*.proto
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'src', 'generated')
const PROTO_DIR = join(ROOT, 'opentool', 'v1')

console.log('📦 OpenTool Proto — TypeScript Generation')
console.log('=========================================\n')

// Check if proto-loader-gen-types is available
try {
  execSync('npx proto-loader-gen-types --help', { stdio: 'pipe' })
} catch {
  console.log('ℹ  proto-loader-gen-types not found. Installing...')
  execSync('npm install -g @grpc/proto-loader', { stdio: 'inherit' })
}

// Create output directory
if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true })
}

const protos = [
  'types.proto',
  'tool_service.proto',
  'auth_service.proto',
  'health.proto',
  'mcp_transport.proto',
]

console.log(`Proto directory: ${PROTO_DIR}`)
console.log(`Output directory: ${OUT_DIR}`)
console.log(`Protos: ${protos.join(', ')}\n`)

try {
  const cmd = [
    'npx proto-loader-gen-types',
    '--longs=String',
    '--enums=String',
    '--defaults',
    '--oneofs',
    '--grpcLib=@grpc/grpc-js',
    `-I ${ROOT}`,
    `-O ${OUT_DIR}`,
    ...protos.map(p => join(PROTO_DIR, p)),
  ].join(' ')

  console.log(`Running: ${cmd}\n`)
  execSync(cmd, { stdio: 'inherit', cwd: ROOT })
  console.log('\n✅ TypeScript types generated successfully!')
  console.log(`   Output: ${OUT_DIR}`)
} catch (err) {
  console.error('\n❌ Generation failed. The manual types in src/index.ts remain the source of truth.')
  console.error('   Static codegen is optional — the runtime uses dynamic loading.')
  process.exit(1)
}
