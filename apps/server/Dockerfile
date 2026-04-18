FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ─── Install deps ───
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/tool-schema/package.json packages/tool-schema/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile

# ─── Build tool-schema first ───
FROM deps AS build-schema
COPY packages/tool-schema packages/tool-schema
RUN pnpm --filter @opentool/tool-schema build

# ─── Generate Prisma client ───
FROM build-schema AS build-server
COPY apps/server/prisma apps/server/prisma
RUN pnpm --filter @opentool/server exec prisma generate

# ─── Build server ───
COPY apps/server apps/server
RUN pnpm --filter @opentool/server build

# ─── Production image ───
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Copy package manifests for production install
COPY --from=build-server /app/package.json ./package.json
COPY --from=build-server /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build-server /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build-server /app/packages/tool-schema/package.json ./packages/tool-schema/
COPY --from=build-server /app/apps/server/package.json ./apps/server/

# Production-only install (no devDependencies)
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=build-server /app/packages/tool-schema/dist ./packages/tool-schema/dist
COPY --from=build-server /app/apps/server/dist ./apps/server/dist
COPY --from=build-server /app/apps/server/prisma ./apps/server/prisma
COPY --from=build-server /app/apps/server/node_modules/.prisma ./apps/server/node_modules/.prisma

ENV NODE_ENV=production
EXPOSE 3001

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 opentool
USER opentool

WORKDIR /app/apps/server
CMD ["node", "dist/src/index.js"]
