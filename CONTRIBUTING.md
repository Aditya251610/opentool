# Contributing to OpenTool

Thanks for wanting to contribute! OpenTool is fully open-source and we welcome PRs of all sizes.

## Quick Start

```bash
git clone https://github.com/Aditya251610/opentool.git
cd opentool
pnpm install
cp .env.example apps/server/.env
# Fill in your .env values (see docs/configuration.md)
cd apps/server && npx prisma db push && npx tsx prisma/seed.ts
cd ../.. && pnpm dev
```

## Project Structure

```
apps/server/          → Hono MCP server + REST API
apps/dashboard/       → Next.js dashboard
packages/cli/         → opentool-cli (Ink + Commander)
packages/sdk/ts/      → TypeScript SDK (@opentool-ts/sdk)
packages/sdk/python/  → Python SDK (opentool)
packages/tool-schema/ → Shared types
```

## Adding a New Tool

This is the most common contribution. Each tool is ~50-150 lines:

1. Create `apps/server/tools/yourprovider/index.ts`
2. Define tools using `defineTool()` from `@opentool/tool-schema`
3. Register in `apps/server/src/registry/index.ts`
4. Add OAuth credentials to `.env.example`
5. Add seed data in `prisma/seed.ts`

See [docs/contributing-a-tool.md](docs/contributing-a-tool.md) for the full guide.

## Development Workflow

1. **Fork** the repo and create a branch from `main`
2. **Make changes** — keep PRs focused on one thing
3. **Test** — run `cd apps/server && pnpm test` to ensure tests pass
4. **Lint** — run `cd apps/server && pnpm lint` (0 errors required)
5. **Open a PR** against `main`

## Code Style

- TypeScript strict mode
- Prettier for formatting (runs on pre-commit via husky)
- ESLint for linting (0 errors policy, warnings OK for `no-explicit-any`)
- Conventional commits preferred: `feat:`, `fix:`, `docs:`, `chore:`

## Areas We Need Help

- **New tool providers** — Any SaaS with an API is a candidate
- **Tests** — More integration tests for tool execution
- **Docs** — Improvements, typo fixes, examples
- **CLI** — New commands, better UX
- **SDK** — More language SDKs (Go, Rust, etc.)

## Reporting Issues

Use [GitHub Issues](https://github.com/Aditya251610/opentool/issues). Include:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Node version, OS, and relevant env details

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
