# Changelog

All notable changes to the OpenTool project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Zero-vulnerability dependency baseline (hono 4.12.14, @hono/node-server 1.19.14, vitest 3.2, vite 6.4)
- CLI smoke tests (30+ tests covering cache, fuzzy search, config, API helpers, debug)
- SDK smoke tests (25+ tests covering HttpClient, OpenTool client, error classes, retries)
- CHANGELOG.md for tracking releases

## [0.1.1] - 2025-04-18

### Added

- **CLI**: Published `opentool-cli@0.1.1` to npm
- **SDK**: Published `@opentool-ts/sdk@0.1.1` to npm
- **CLI**: `doctor` command — 9-point diagnostic check
- **CLI**: `history` command — search and replay past commands
- **CLI**: `completion` command — zsh/bash tab completions
- **CLI**: Fuzzy search suggestions ("Did you mean…?")
- **CLI**: In-memory TTL cache to reduce redundant API calls
- **CLI**: Debug mode (`--debug` flag or `OPENTOOL_DEBUG=1`)
- **CLI**: Animated spinner with elapsed time
- **CLI**: Update checker (non-blocking npm registry check)
- **CLI**: Gradient banner and rotating taglines
- **Server**: Postgres tools expanded from 1 → 4 (execute_query, list_tables, describe_table, run_transaction)
- **Server**: `pg` added as direct dependency (was missing)
- **Infra**: CI pipeline builds dashboard, CLI, and SDK (not just server)
- **Infra**: Dockerfile optimized — production-only deps, non-root user
- **Infra**: `install.sh` curl installer for quick setup
- **Docs**: CLI reference, quickstart, tools guide updated
- **Docs**: CODE_OF_CONDUCT.md, CONTRIBUTING.md, issue/PR templates
- **Docs**: PRIVACY.md

### Fixed

- Default server URL changed from localhost to `https://opentool.onrender.com`
- ESLint config: fixed critical `raw` → `fullKey` bug in auth.ts
- Render build: `"prepare": "husky || true"` prevents CI failures

### Security

- AES-256-GCM encryption for OAuth tokens at rest
- XOR obfuscation for sessionStorage API keys (dashboard)
- CSP and HSTS security headers
- SDK retry logic with exponential backoff
- Rate limiting on auth endpoints (20 req/min)

## [0.1.0] - 2025-04-15

### Added

- **Core**: MCP-compliant tool server with Hono + Prisma + Redis
- **Providers**: GitHub, Notion, Slack, Linear, Gmail, Google Calendar, Stripe, Vercel, Resend, Postgres (26 tool actions)
- **Auth**: OAuth 2.0 broker with PKCE for all providers
- **Auth**: API key authentication with SHA-256 hashing
- **Dashboard**: Next.js admin UI with provider connections, tool browser, API key management
- **CLI**: Interactive REPL with Ink (React for terminal) + Commander subcommands
- **SDK**: TypeScript SDK with zero `any` types, resource-based API
- **SDK**: Python SDK published to PyPI
- **Infra**: Docker + docker-compose with health checks
- **Infra**: Prisma schema with 7 models, cascading deletes, proper indexes
- **Testing**: 211 tests across 12 test files (Vitest)
- **Observability**: Structured logging, Prometheus metrics, audit logs with retention
- **Docs**: Architecture, authentication, self-hosting, security, troubleshooting guides

[Unreleased]: https://github.com/Aditya251610/opentool/compare/cli-v0.1.1...HEAD
[0.1.1]: https://github.com/Aditya251610/opentool/compare/cli-v0.1.0...cli-v0.1.1
[0.1.0]: https://github.com/Aditya251610/opentool/releases/tag/cli-v0.1.0
