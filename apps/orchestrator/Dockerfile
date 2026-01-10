# Multi-stage build for Orchestrator service
FROM node:20-alpine AS builder

WORKDIR /build

# Install pnpm
RUN npm install -g pnpm

# Copy monorepo files
COPY pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy packages and apps
COPY packages ./packages
COPY apps/orchestrator ./apps/orchestrator

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages
RUN pnpm --filter @in-midst-my-life/schema build
RUN pnpm --filter @in-midst-my-life/core build

# Build orchestrator
RUN pnpm --filter @in-midst-my-life/orchestrator build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Install pnpm
RUN npm install -g pnpm

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy from builder
COPY --from=builder --chown=nodejs:nodejs /build/packages ./packages
COPY --from=builder --chown=nodejs:nodejs /build/apps/orchestrator ./apps/orchestrator

# Install production dependencies only
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3002

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["node", "apps/orchestrator/dist/index.js"]
