# Stage 1 — install deps (flat/hoisted so native modules resolve correctly)
FROM node:24-alpine AS deps
ENV CI=true
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# node-linker=hoisted gives a flat node_modules (no symlinks into .pnpm)
RUN echo "node-linker=hoisted" > .npmrc
RUN pnpm install --frozen-lockfile

# Stage 2 — build
FROM node:24-alpine AS builder
ENV CI=true
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DB client opens at module eval time — directory must exist for the build to succeed
RUN mkdir -p data
# Build Next.js (standalone output)
RUN pnpm build
# Build worker
RUN pnpm exec tsc -p tsconfig.worker.json

# Stage 3 — runtime
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Next.js standalone bundle
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Worker dist
COPY --from=builder /app/dist ./dist

# Native sqlite3 bindings (flat layout from hoisted install)
COPY --from=deps /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

EXPOSE 3000
CMD ["node", "server.js"]
