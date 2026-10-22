# ==========================================
# BASE STAGE - Common dependencies and setup
# ==========================================

# syntax = docker/dockerfile:1

FROM node:26.12.1-alpine3.24@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS base

RUN apk add --no-cache --upgrade 'ca-certificates>=20261020-r0'
RUN ! grep -q MIICTjCCAdOgAwIBAgIKPPYHqWhwDtqLhDAKBggqhkjOPQQDAzBrMQswCQYDVQQG /etc/ssl/certs/ca-certificates.crt

# Remix app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=3000

# ==========================================
# BUILD STAGE - Compile and prepare the app
# ==========================================
FROM base AS build

ARG SENTRY_AUTH_TOKEN
ARG VERSION=dev

# Set environment variables
ENV VERSION=${VERSION}
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

# Install dependencies
COPY --link package.json package-lock.json ./
RUN npm ci --include=dev --ignore-scripts --no-audit --no-fund

# Copy application code
COPY --link . .

# Build application
RUN npm run build && \
    npm prune --omit=dev --ignore-scripts --no-audit --no-fund && \
    touch .env

# ==========================================
# PRODUCTION STAGE - Final lightweight image
# ==========================================
FROM base

# Accept VERSION as build argument and set as environment variable
ARG VERSION=dev
ENV VERSION=${VERSION}

# Create the non-root user first so ownership can be applied during COPY.
# Doing the chown in the COPY layer avoids a second full-size layer that a
# separate `chown -R /app` would create (it rewrites every file).
RUN addgroup -g 1001 datum && \
    adduser -u 1001 -G datum -D -H datum

# Copy the built app from the build stage, owned by the runtime user.
COPY --from=build --chown=datum:datum /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE ${PORT}

USER datum

CMD [ "node", "./observability/start.js" ]
