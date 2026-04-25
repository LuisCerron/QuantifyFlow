# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Builder ----
FROM base AS builder
WORKDIR /app

# Firebase client config — needed at build time because NEXT_PUBLIC_* is baked.
# Defaults allow standalone builds (docker build .) without an .env file.
# docker-compose or real env vars will override these at build time.
ARG NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBuildDummyKey00000000000000000
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=build-dummy.firebaseapp.com
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=build-dummy
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=build-dummy.appspot.com
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
ARG NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:builddummy

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Runner ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
