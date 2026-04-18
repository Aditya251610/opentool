# OpenTool Documentation

> The docs for the layer your agent should have had from the start.

Welcome to OpenTool's documentation. Whether you're here to self-host, connect your first tool, or build a custom integration — this is where you start.

No 47-page onboarding guide. No "enterprise readiness assessment." Just the stuff you need.

**Quick install:** `npm i -g opentool-cli` → `opentool init` → `opentool login` → done.

---

## Getting Started

| Doc                                 | What it covers                               |
| ----------------------------------- | -------------------------------------------- |
| [Quickstart](./quickstart.md)       | Go from zero to connected tools in 5 minutes |
| [Self-Hosting](./self-hosting.md)   | Run OpenTool on your own infrastructure      |
| [Configuration](./configuration.md) | Environment variables, OAuth apps, providers |

## Core Concepts

| Doc                                     | What it covers                                     |
| --------------------------------------- | -------------------------------------------------- |
| [Architecture](./architecture.md)       | How the pieces fit together                        |
| [Authentication](./authentication.md)   | OAuth flows, API keys, token management            |
| [Tools](./tools.md)                     | All 10 providers, 26 actions                       |
| [MCP Integration](./mcp-integration.md) | Connect Claude, Cursor, VS Code, or any MCP client |

## Building & Extending

| Doc                                             | What it covers                                                                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [SDK Reference](./sdk-reference.md)             | TypeScript ([npm](https://www.npmjs.com/package/@opentool-ts/sdk)) and Python ([PyPI](https://pypi.org/project/opentool/)) |
| [CLI Reference](./cli-reference.md)             | Interactive REPL, subcommands, shell completions                                                                           |
| [Contributing a Tool](./contributing-a-tool.md) | Add your own provider in ~100 lines                                                                                        |
| [API Reference](./api-reference.md)             | Every REST endpoint documented                                                                                             |

## Operations

| Doc                                     | What it covers                           |
| --------------------------------------- | ---------------------------------------- |
| [Security](./security.md)               | Encryption, token handling, threat model |
| [Troubleshooting](./troubleshooting.md) | Common issues and how to fix them        |

---

## Philosophy

OpenTool is not a platform. It's a tool for people who build things.

- Your tokens live on **your** infrastructure
- Your data never touches **our** servers (there are no "our servers")
- Everything is inspectable, forkable, and auditable

If you're looking for a vendor to blame when things break, this isn't it.
If you're looking for something that actually works, keep reading.
