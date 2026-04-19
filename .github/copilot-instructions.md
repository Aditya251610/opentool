# Copilot Instructions — OpenTool

## Project Overview

OpenTool is an open-source, self-hosted MCP (Model Context Protocol) server that provides 26 tools across 10 providers (GitHub, Gmail, Slack, Notion, Linear, Google Calendar, Stripe, Vercel, Resend, Postgres/Neon). It's the open-source alternative to Arcade.dev and Composio.

## Code Rules

- NEVER commit or push — the maintainer handles that manually.
- TypeScript strict mode throughout.
- All tools use Zod schemas for input validation.
- Monorepo structure: `packages/server`, `packages/cli`, `packages/sdk`, `apps/dashboard`.

---

## Design Context

### Users

**Primary audience**: Backend and full-stack developers building AI agents who need tool integrations (GitHub, Slack, Gmail, Notion, etc.) without vendor lock-in. They're evaluating OpenTool against Arcade.dev and Composio — they'll pick the one that looks like it was built by someone who actually ships.

**Context of use**: Developers discover OpenTool from a GitHub README, a tweet, or a search for "open source MCP server." They land on the marketing site to evaluate it, then move to the dashboard to connect tools and manage API keys. They interact with OpenTool primarily through the CLI or SDK — the dashboard is for setup and monitoring.

**Job to be done**: Wire up third-party APIs (GitHub, Slack, Stripe, etc.) as MCP-compatible tools for their AI agents, without writing OAuth flows, token refresh logic, or API wrappers themselves. Self-hosted, own their data, no recurring SaaS bill.

### Brand Personality

**Three words**: Sharp. Owned. Uncompromising.

**Voice**: Direct and technical. No filler, no buzzwords, no "supercharge your workflow." Slightly aggressive when calling out bad patterns — this is the tool senior engineers wish existed. Talks to developers as peers, not prospects.

**Emotional goals** (all four, weighted):

1. **"This is serious infrastructure"** — trust, reliability, production-grade (primary)
2. **"This dev gets it"** — sharp, opinionated, built by someone who felt the pain
3. **"This is beautiful AND works"** — polished craft that signals quality
4. **"Finally, something I can own"** — freedom, self-hosted pride

### Aesthetic Direction

**Visual tone**: Dark, premium, dimensional. Think luxury-grade developer infrastructure — not flashy SaaS, not sterile corporate. The interface should feel like a precision instrument.

**Theme**: Dark only (light mode deferred). Pure black base (#000000) with carefully tinted dark surfaces.

**3D & motion**: Three.js particle constellation hero. Lean into dimensional effects — depth, parallax, spatial UI. Aceternity-style components with purposeful motion, not decoration.

**Component style**: shadcn/ui-adjacent — composable, minimal chrome, sharp edges. No rounded-everything softness. Borders over shadows. Surfaces over cards-in-cards.

**Accent color direction**: Warm amber/gold (`oklch(0.78 0.15 75)`, approximately #D4960A) — premium, warm, distinct from competitors.

### Design Principles

1. **Precision over decoration** — Every pixel serves a purpose. No ornamental gradients, no decorative sparklines, no glow-for-glow's-sake.
2. **Depth is information** — Use the z-axis to convey hierarchy and state, not just aesthetics.
3. **Warmth through craft, not color** — Achieve warmth through typography, spacing rhythm, micro-interactions, and amber accents.
4. **Developer-native density** — Tight spacing in data-heavy views, generous spacing in marketing/onboarding.
5. **Owned, not borrowed** — The design should not look like a template with different content.
