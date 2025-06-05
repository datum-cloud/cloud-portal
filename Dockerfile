# ==========================================
# BASE STAGE - Common dependencies and setup
# ==========================================
FROM oven/bun:1.2 AS base

# Install system dependencies and clean up in the same layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends unzip && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Set working directory and environment variables
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# ==========================================
# BUILD STAGE - Compile and prepare the app
# ==========================================
FROM base AS build

# Install dependencies first (better layer caching)
COPY --link package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy application code
COPY --link . .

# Build application and clean up
RUN bun run build && \
    bun install --production --frozen-lockfile && \
    touch .env

# ==========================================
# PRODUCTION STAGE - Final lightweight image
# ==========================================
FROM base

# Copy only necessary files from build stage
COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/bun.lock /app/bun.lock
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/.env /app/.env

# Expose port
EXPOSE ${PORT}

# Use non-root user for better security
RUN addgroup --system --gid 1001 datum && \
    adduser --system --uid 1001 datum && \
    chown -R datum:datum /app

USER datum

# Start the application
CMD ["bun", "run", "start"]
