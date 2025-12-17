# ==========================================
# BASE STAGE - Common dependencies and setup
# ==========================================

# syntax = docker/dockerfile:1

# Use the latest Bun version
FROM oven/bun:1.3.5 AS base

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

# Copy only necessary files from build stage
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE ${PORT}

# Use non-root user for better security
RUN addgroup --system --gid 1001 datum && \
    adduser --system --uid 1001 datum && \
    chown -R datum:datum /app

USER datum

# Use the start script from package.json
CMD [ "bun", "run", "start" ]
