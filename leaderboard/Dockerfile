# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9 --activate

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# Stage 2: Production (standalone output)
FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy standalone output and static files
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Install only production deps for standalone
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

ENV NODE_ENV=production
ENV PORT=3002
ENV API_URL=http://ar-overlay:3001

EXPOSE 3002

# Fix permissions for non-root user
RUN chown -R node:node /app

USER node

CMD ["node", "server.js"]
