# ==========================================
# BASE STAGE - Common dependencies and setup
# ==========================================

# syntax = docker/dockerfile:1

# Use the latest Bun version
FROM oven/bun:1.4.2@sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895 AS base

# Install system dependencies and clean up in the same layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends unzip ca-certificates && \
    update-ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Remix app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=3000 \
    BUN_RUNTIME_TRANSPILER_CACHE_PATH=/tmp/bun-transpiler-cache
    
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
COPY --link package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy application code
COPY --link . .

# Build application
RUN bun run build && \
    bun install --production --frozen-lockfile && \
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
RUN groupadd --gid 1001 datum && \
    useradd --uid 1001 --gid 1001 --no-create-home datum

# Copy the built app from the build stage, owned by the runtime user.
COPY --from=build --chown=datum:datum /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE ${PORT}

USER datum

# Use the start script from package.json
CMD [ "bun", "run", "start" ]
