# Multi-stage single-server Dockerfile for Swadesh AI Fullstack
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# 1. Install dependencies
FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci

# 2. Build application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma Client & Build
RUN cd apps/backend && npx prisma generate
RUN npm run build

# 3. Production Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend ./apps/backend
COPY --from=builder /app/apps/frontend/dist ./apps/frontend/dist
COPY --from=builder /app/packages/shared ./packages/shared

EXPOSE 3001

CMD ["sh", "-c", "cd apps/backend && npx prisma db push && npx tsx prisma/seed.ts && npx tsx src/index.ts"]
