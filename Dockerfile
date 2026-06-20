# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app

# Enable pnpm via corepack (no global install)
RUN corepack enable && corepack prepare pnpm@9 --activate

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy build artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

# Copy server files and config
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./
COPY --from=build /app/production-server.js ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Remove pnpm store to reduce image size
RUN pnpm store prune && rm -rf /root/.local/share/pnpm

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/me || exit 1

USER node

CMD ["node", "production-server.js"]
