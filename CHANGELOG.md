# Changelog

All notable changes to the OpenTool project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.11](https://github.com/Aditya251610/opentool/compare/opentool-v0.1.10...opentool-v0.1.11) (2026-04-26)


### Features

* add 11 new providers (66 tools) + MCP quality upgrade ([3938e00](https://github.com/Aditya251610/opentool/commit/3938e002dee70834006530b40fec08df7947da93))


### Miscellaneous

* bump python sdk to 0.1.1 ([f60484d](https://github.com/Aditya251610/opentool/commit/f60484d55f072b63f7a23d48baa9df1ad6126996))

## [0.1.10](https://github.com/Aditya251610/opentool/compare/opentool-v0.1.9...opentool-v0.1.10) (2026-04-21)


### Features

* added query tool and token analyzer features ([55dc7fd](https://github.com/Aditya251610/opentool/commit/55dc7fd6e627cc8e02e377768069cb2148027ccd))

## [0.1.9](https://github.com/Aditya251610/opentool/compare/opentool-v0.1.8...opentool-v0.1.9) (2026-04-21)


### Features

* security audit remediation + tool query meta-tools + lint hardening ([d4b4dd1](https://github.com/Aditya251610/opentool/commit/d4b4dd122b03defc3a5efb23db9b6aa07b1d388a))


### CI/CD

* updated ci order ([6cd38c4](https://github.com/Aditya251610/opentool/commit/6cd38c4e9f74d9250c128242136e8f79c960af5d))

## [0.1.8](https://github.com/Aditya251610/opentool/compare/opentool-v0.1.7...opentool-v0.1.8) (2026-04-21)


### Features

* improved mcp server and tools and made them organised ([19d1e05](https://github.com/Aditya251610/opentool/commit/19d1e0517ae583903621dde313d0ae8925d5fe52))

## [0.1.7](https://github.com/Aditya251610/opentool/compare/opentool-v0.1.6...opentool-v0.1.7) (2026-04-21)


### Bug Fixes

* remove CSP nonce — breaks Next.js hydration and Vercel Live ([5ff93a5](https://github.com/Aditya251610/opentool/commit/5ff93a5a34ae4c2bd2cc8884428b6ec431ea8ca9))

## [0.1.6](https://github.com/Aditya251610/opentool/compare/opentool-v0.1.5...opentool-v0.1.6) (2026-04-21)


### Bug Fixes

* CSP allow inline scripts fallback for Next.js hydration ([e04830f](https://github.com/Aditya251610/opentool/commit/e04830f070a842172ad975c432ac294a8d5873af))

## [0.1.5](https://github.com/Aditya251610/opentool/compare/opentool-v0.1.4...opentool-v0.1.5) (2026-04-21)


### Features

* production hardening + Next.js optimizations ([fe4c512](https://github.com/Aditya251610/opentool/commit/fe4c512b1d67909eac9aeeb5bd8019318073d1c4))


### Bug Fixes

* remove unused config imports (lint errors) ([bfbf0e4](https://github.com/Aditya251610/opentool/commit/bfbf0e44249ec10820ec779ac34b75d37a7e18f5))

## [0.1.4](https://github.com/Aditya251610/opentool/compare/opentool-v0.1.3...opentool-v0.1.4) (2026-04-21)


### Features

* add Google OAuth login + fix lint errors ([adcc586](https://github.com/Aditya251610/opentool/commit/adcc586bc492af3584f181d25fad141004901d18))

## [0.1.3](https://github.com/Aditya251610/opentool/compare/opentool-v0.1.2...opentool-v0.1.3) (2026-04-21)


### Features

* organizations, RBAC, SSO, GDPR — full multitenancy ([651a62d](https://github.com/Aditya251610/opentool/commit/651a62d13df6e75fd4f00abeb1cf455b2954836f))
* organizations, RBAC, SSO, GDPR — full multitenancy ([b131c8c](https://github.com/Aditya251610/opentool/commit/b131c8c9d1dacf5557e10b535a381140a5db24a5))

## [0.1.2](https://github.com/Aditya251610/opentool/compare/opentool-v0.1.1...opentool-v0.1.2) (2026-04-20)


### Features

* add gRPC transport with MCP bridge, CLI support, and proto generation ([9060949](https://github.com/Aditya251610/opentool/commit/90609490bf98499060aad6481f42b78bd9b4ab13))
* added legal pages ([bdc1ff4](https://github.com/Aditya251610/opentool/commit/bdc1ff4fe46e13f49a0d07a8ea07eff30625114b))
* added logo ([d173503](https://github.com/Aditya251610/opentool/commit/d17350302dccde8ce4b75a3dd8378e1177caad6b))
* added streamable http flow ([07a3714](https://github.com/Aditya251610/opentool/commit/07a37141fcacdbc699e7e3ac49338b726789a4de))
* added user prompt + security patch 1 ([f8c804a](https://github.com/Aditya251610/opentool/commit/f8c804a7974afb33c3c49a77d5155f408538e387))
* all tools working ([ac4ab3a](https://github.com/Aditya251610/opentool/commit/ac4ab3a1d99d0f0eb6c41b16e0f8427478bd439e))
* api router, all REST routes wired ([9477faa](https://github.com/Aditya251610/opentool/commit/9477faa0bbe603088ed6bce9eacaa8c0a5340d52))
* attach SDK build artifacts to GitHub releases ([07656de](https://github.com/Aditya251610/opentool/commit/07656deade6db625a500fba42cd9964f9c52f6bf))
* built tools and added cli ([b639a63](https://github.com/Aditya251610/opentool/commit/b639a6307de7fd6544cc8f6ac44f8df5ea81a4a6))
* built v0 ([a4523b5](https://github.com/Aditya251610/opentool/commit/a4523b5bb373554e9fab8b351a991f7341d249eb))
* CLI distribution — npm, GitHub Releases, install script ([cb5ff64](https://github.com/Aditya251610/opentool/commit/cb5ff64e3ce1a2435e28f36bf058a0890e5579b3))
* db seed with providers and tool definitions ([24d678f](https://github.com/Aditya251610/opentool/commit/24d678fbd1c7765aa83b1636447783b657c55158))
* enhanced the neon postgres tool ([ca6712a](https://github.com/Aditya251610/opentool/commit/ca6712a70d3a3368df108df155d970b397d192df))
* hono server with health and tools endpoints ([0ef0df8](https://github.com/Aditya251610/opentool/commit/0ef0df8f1b111a8b2e87c0e0405204d499efac0c))
* implemented SEO and AI discoverability ([a250538](https://github.com/Aditya251610/opentool/commit/a2505382d4743241314cccebcbee97275e4a90eb))
* MCP server working, HTTP transport via InMemoryTransport ([30180f5](https://github.com/Aditya251610/opentool/commit/30180f5ee5d6be1b1b3bcaf03da8997511fce554))
* mcp skeleton ready ([ff4973d](https://github.com/Aditya251610/opentool/commit/ff4973d3a60583d6e103e9a768d437108b18c0b6))
* mcp working ([411c2e9](https://github.com/Aditya251610/opentool/commit/411c2e937972adbdc8c67c63fc8becb319d12244))
* publish SDK to GitHub Packages + create GitHub Releases ([71148a0](https://github.com/Aditya251610/opentool/commit/71148a037577e240502f3c15bc5ddb49823d56a5))
* schema migration, tool-schema package, github tools ([a5b7e2b](https://github.com/Aditya251610/opentool/commit/a5b7e2be04b99d18aa739dd4f4cbf3ac78166296))
* security patch 2 + deployment base setup ([ff90e60](https://github.com/Aditya251610/opentool/commit/ff90e60d3570dd3ee36dd7a16c7bdea3feec908d))
* styling fix and optimization ([065cb9e](https://github.com/Aditya251610/opentool/commit/065cb9ebd979625ef9cf15e2c152166683559d91))
* tool registry ([5162b63](https://github.com/Aditya251610/opentool/commit/5162b633c6229fd9afa9f5fefd43600b9a478547))


### Bug Fixes

* api key prefix fix ([2f319c9](https://github.com/Aditya251610/opentool/commit/2f319c93cca71ac738a982ace78f8ae664b95ab0))
* ci fixes ([afa2823](https://github.com/Aditya251610/opentool/commit/afa2823a48af1126e8d2515a68cea8f57c7f01b0))
* ci workflow fix ([d7a9811](https://github.com/Aditya251610/opentool/commit/d7a98110d286bd6c8dedc260f2403b42386a0a2f))
* **cli:** default server URL to hosted backend ([e06e30b](https://github.com/Aditya251610/opentool/commit/e06e30b1e67f7f5663cc8ca938335454b46d55a5))
* excluded tests from prod ([acbc60d](https://github.com/Aditya251610/opentool/commit/acbc60dd4614ae1e8d472767d288b80683497204))
* failing tests fix ([5841b17](https://github.com/Aditya251610/opentool/commit/5841b17411a47d04c63416b073cbc402dabbc56e))
* failing tests fix ([11ad655](https://github.com/Aditya251610/opentool/commit/11ad655606a80a5e29d0a3144522237271e6de9a))
* fixed deps issue ([adee379](https://github.com/Aditya251610/opentool/commit/adee37969dc44ec38e865f3fd8dff5296f824584))
* handle double Bearer prefix in MCP auth header ([cff9095](https://github.com/Aditya251610/opentool/commit/cff90959edc4caec7ea3a8cf11778e096a3056b3))
* move tsx to dependencies for production seed ([155a3d5](https://github.com/Aditya251610/opentool/commit/155a3d59f5c950e63b4b5abe65a4e76afa706951))
* neon logo fix ([6f1acd3](https://github.com/Aditya251610/opentool/commit/6f1acd3ea0d858f0a7c7d3c451dd04869a010c9a))
* pin Node to 20 for Prisma 5 compat ([15cbd49](https://github.com/Aditya251610/opentool/commit/15cbd491fb5ed22e813f1840ea2742a5e10a5f2d))
* prisma dependency fix ([53c91fc](https://github.com/Aditya251610/opentool/commit/53c91fce4f63fc582433bba6957d022a785a7fdc))
* release-please ci run fix ([e2cc469](https://github.com/Aditya251610/opentool/commit/e2cc469babffc943a86d02d123fbaef38691ea8b))
* rename sdk wrapper to avoid workspace name conflict ([088a150](https://github.com/Aditya251610/opentool/commit/088a150c303e01fa0995773553a51045ed0579e3))
* replace dots with underscores in MCP tool names ([ece7224](https://github.com/Aditya251610/opentool/commit/ece722435bb64d26c2621ff88dc1172b3d8c93cb))
* resolve all P1/P2 critique issues — effects cleanup, design unification, font consolidation, accessibility, confirm dialogs ([e5fd46e](https://github.com/Aditya251610/opentool/commit/e5fd46ebef1cb5d3ed5a112c65bf3062997fa6bf))
* restore FloatingLogos and CursorNebula on hero section ([418e2a2](https://github.com/Aditya251610/opentool/commit/418e2a2dbda97def35ab8ed7120504b1d85ee272))
* return 401 for invalid/revoked API keys instead of 500 ([18a3e45](https://github.com/Aditya251610/opentool/commit/18a3e45b565b73d453c05bcdc8d0f1a62a691f58))
* Revise agent connection instructions in README ([5b3112b](https://github.com/Aditya251610/opentool/commit/5b3112bd9cda2c58435e3254949c6e0fed5e2479))
* ts package fix ([149f409](https://github.com/Aditya251610/opentool/commit/149f40989d871534099d8bf7c8c77e9b45ea406f))
* ui api key copy fix ([0cd70e4](https://github.com/Aditya251610/opentool/commit/0cd70e4824803b135394cd4ea919edb15106c2a3))
* update lockfile for prisma dep change ([f9b93ad](https://github.com/Aditya251610/opentool/commit/f9b93ada31d190efc49e49be4581ca3d4da472d1))
* Update Node.js version in .nvmrc to 20 ([6205804](https://github.com/Aditya251610/opentool/commit/6205804f3b82b5a38f2cef7390e880976305279e))
* vercel deployment fix ([8959d7e](https://github.com/Aditya251610/opentool/commit/8959d7eff2e352f7766668471f8db5dbfb39ec31))


### Performance

* optimize loading speed and runtime performance across all pages ([c1158e9](https://github.com/Aditya251610/opentool/commit/c1158e96dd49b25cfa74173cc351d4df232630f1))


### Documentation

* update README and docs to match current codebase ([cbbe32f](https://github.com/Aditya251610/opentool/commit/cbbe32fc80524e5018dd2db90b6b82955c1d26c6))


### Miscellaneous

* add debug logging for MCP key validation ([ffb626c](https://github.com/Aditya251610/opentool/commit/ffb626cf895fe3ccdb111d1181c99483759dc06a))
* added community details ([34f5bc6](https://github.com/Aditya251610/opentool/commit/34f5bc6aad451fb5fc6bc5c99385d71e6ec4f7f5))
* added mobile responsive fixes, svg fixes for providers and api key providing fixes ([dae6038](https://github.com/Aditya251610/opentool/commit/dae6038a437bc9814eac00dd30e717e8380cbb79))
* bump TS SDK to v0.1.1 ([be92ac1](https://github.com/Aditya251610/opentool/commit/be92ac14104b056a4030d6a40ae641c4b2e8a83f))
* fixed hardcoded values, svgs ([4eddd26](https://github.com/Aditya251610/opentool/commit/4eddd26aada27bfb47fc66a388d2943a594b12fb))
* remove debug logging from MCP auth flow ([1b97527](https://github.com/Aditya251610/opentool/commit/1b975271cae0eb6fcec8c88165eae78e9487f449))


### CI/CD

* added release-please for automated CHANGELOG and releases ([887795c](https://github.com/Aditya251610/opentool/commit/887795c0061b00cd5008267a10f6aca34514303e))

## [Unreleased]

### Added

- **gRPC Transport**: Full gRPC server with ToolService, HealthService, and McpTransport RPCs
- **gRPC Proto Package**: `@opentool/proto` with Protocol Buffer definitions, TypeScript + Python code generation
- **gRPC-MCP Bridge**: Bidirectional streaming MCP-over-gRPC transport (Connect + Send RPCs)
- **gRPC Auth**: Server interceptors for API key authentication and request logging
- **gRPC Streaming**: Server-streaming ExecuteTool and BatchExecute with progress updates
- **CLI gRPC Support**: `--transport grpc` flag for tools/exec/status commands, `set-grpc-url` command
- **CLI gRPC Doctor**: Health check for gRPC endpoint in `doctor` command
- **Multi-language Proto Gen**: Scripts for TypeScript and Python stub generation
- Zero-vulnerability dependency baseline (hono 4.12.14, @hono/node-server 1.19.14, vitest 3.2, vite 6.4)
- CLI smoke tests (30+ tests covering cache, fuzzy search, config, API helpers, debug)
- SDK smoke tests (25+ tests covering HttpClient, OpenTool client, error classes, retries)
- CHANGELOG.md for tracking releases
- Automated changelog via release-please

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
