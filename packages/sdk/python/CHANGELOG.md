# Changelog

## [0.1.2](https://github.com/Aditya251610/opentool/compare/sdk-py-v0.1.1...sdk-py-v0.1.2) (2026-04-26)


### Documentation

* production-ready changelogs — clean up root, fix SDK TS noise, add Python SDK ([86f9209](https://github.com/Aditya251610/opentool/commit/86f92096b3060009b136b4a444555669c43771a0))

## [0.1.1](https://github.com/Aditya251610/opentool/compare/sdk-py-v0.1.0...sdk-py-v0.1.1) (2026-04-26)

### Features

- add 11 new providers (66 tools) + MCP quality upgrade ([3938e00](https://github.com/Aditya251610/opentool/commit/3938e002dee70834006530b40fec08df7947da93))
- all 26 providers supported via flexible `str` provider type

### Miscellaneous

- initial PyPI release as `opentool-sdk`

## 0.1.0 (2025-04-15)

### Features

- Python SDK for OpenTool MCP server
- Async-first client with `httpx`
- Type-safe models with Pydantic v2
- Resource-based API: `client.tools`, `client.auth`, `client.keys`
- Auto-retry with exponential backoff
- Full provider support via flexible string typing
