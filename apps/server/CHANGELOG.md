# Changelog

## [0.0.2](https://github.com/Aditya251610/opentool/compare/server-v0.0.1...server-v0.0.2) (2026-04-20)


### Features

* add gRPC transport with MCP bridge, CLI support, and proto generation ([9060949](https://github.com/Aditya251610/opentool/commit/90609490bf98499060aad6481f42b78bd9b4ab13))
* added streamable http flow ([07a3714](https://github.com/Aditya251610/opentool/commit/07a37141fcacdbc699e7e3ac49338b726789a4de))
* added user prompt + security patch 1 ([f8c804a](https://github.com/Aditya251610/opentool/commit/f8c804a7974afb33c3c49a77d5155f408538e387))
* all tools working ([ac4ab3a](https://github.com/Aditya251610/opentool/commit/ac4ab3a1d99d0f0eb6c41b16e0f8427478bd439e))
* api router, all REST routes wired ([9477faa](https://github.com/Aditya251610/opentool/commit/9477faa0bbe603088ed6bce9eacaa8c0a5340d52))
* built tools and added cli ([b639a63](https://github.com/Aditya251610/opentool/commit/b639a6307de7fd6544cc8f6ac44f8df5ea81a4a6))
* built v0 ([a4523b5](https://github.com/Aditya251610/opentool/commit/a4523b5bb373554e9fab8b351a991f7341d249eb))
* CLI distribution — npm, GitHub Releases, install script ([cb5ff64](https://github.com/Aditya251610/opentool/commit/cb5ff64e3ce1a2435e28f36bf058a0890e5579b3))
* db seed with providers and tool definitions ([24d678f](https://github.com/Aditya251610/opentool/commit/24d678fbd1c7765aa83b1636447783b657c55158))
* enhanced the neon postgres tool ([ca6712a](https://github.com/Aditya251610/opentool/commit/ca6712a70d3a3368df108df155d970b397d192df))
* hono server with health and tools endpoints ([0ef0df8](https://github.com/Aditya251610/opentool/commit/0ef0df8f1b111a8b2e87c0e0405204d499efac0c))
* MCP server working, HTTP transport via InMemoryTransport ([30180f5](https://github.com/Aditya251610/opentool/commit/30180f5ee5d6be1b1b3bcaf03da8997511fce554))
* mcp skeleton ready ([ff4973d](https://github.com/Aditya251610/opentool/commit/ff4973d3a60583d6e103e9a768d437108b18c0b6))
* mcp working ([411c2e9](https://github.com/Aditya251610/opentool/commit/411c2e937972adbdc8c67c63fc8becb319d12244))
* schema migration, tool-schema package, github tools ([a5b7e2b](https://github.com/Aditya251610/opentool/commit/a5b7e2be04b99d18aa739dd4f4cbf3ac78166296))
* security patch 2 + deployment base setup ([ff90e60](https://github.com/Aditya251610/opentool/commit/ff90e60d3570dd3ee36dd7a16c7bdea3feec908d))
* tool registry ([5162b63](https://github.com/Aditya251610/opentool/commit/5162b633c6229fd9afa9f5fefd43600b9a478547))


### Bug Fixes

* api key prefix fix ([2f319c9](https://github.com/Aditya251610/opentool/commit/2f319c93cca71ac738a982ace78f8ae664b95ab0))
* ci fixes ([afa2823](https://github.com/Aditya251610/opentool/commit/afa2823a48af1126e8d2515a68cea8f57c7f01b0))
* excluded tests from prod ([acbc60d](https://github.com/Aditya251610/opentool/commit/acbc60dd4614ae1e8d472767d288b80683497204))
* failing tests fix ([5841b17](https://github.com/Aditya251610/opentool/commit/5841b17411a47d04c63416b073cbc402dabbc56e))
* failing tests fix ([11ad655](https://github.com/Aditya251610/opentool/commit/11ad655606a80a5e29d0a3144522237271e6de9a))
* fixed deps issue ([adee379](https://github.com/Aditya251610/opentool/commit/adee37969dc44ec38e865f3fd8dff5296f824584))
* handle double Bearer prefix in MCP auth header ([cff9095](https://github.com/Aditya251610/opentool/commit/cff90959edc4caec7ea3a8cf11778e096a3056b3))
* move tsx to dependencies for production seed ([155a3d5](https://github.com/Aditya251610/opentool/commit/155a3d59f5c950e63b4b5abe65a4e76afa706951))
* pin Node to 20 for Prisma 5 compat ([15cbd49](https://github.com/Aditya251610/opentool/commit/15cbd491fb5ed22e813f1840ea2742a5e10a5f2d))
* prisma dependency fix ([53c91fc](https://github.com/Aditya251610/opentool/commit/53c91fce4f63fc582433bba6957d022a785a7fdc))
* replace dots with underscores in MCP tool names ([ece7224](https://github.com/Aditya251610/opentool/commit/ece722435bb64d26c2621ff88dc1172b3d8c93cb))
* return 401 for invalid/revoked API keys instead of 500 ([18a3e45](https://github.com/Aditya251610/opentool/commit/18a3e45b565b73d453c05bcdc8d0f1a62a691f58))


### Miscellaneous

* add debug logging for MCP key validation ([ffb626c](https://github.com/Aditya251610/opentool/commit/ffb626cf895fe3ccdb111d1181c99483759dc06a))
* added mobile responsive fixes, svg fixes for providers and api key providing fixes ([dae6038](https://github.com/Aditya251610/opentool/commit/dae6038a437bc9814eac00dd30e717e8380cbb79))
* remove debug logging from MCP auth flow ([1b97527](https://github.com/Aditya251610/opentool/commit/1b975271cae0eb6fcec8c88165eae78e9487f449))
