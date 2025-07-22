# syntax = docker/dockerfile:1

# Use the latest Bun version
FROM oven/bun:1.2.19 AS base

# Install unzip using apt (Debian/Ubuntu package manager)
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/*

# Remix app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install dependencies
COPY --link package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy application code
COPY --link . .

# Build application
RUN bun run build

# Remove development dependencies
RUN bun install --production --frozen-lockfile

# Add empty .env file so it can be parsed correctly.
RUN touch .env

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Copy start script
COPY docker-start.js /app/docker-start.js

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000

# # Set environment variables
# ENV OTEL_ENABLED=true

# Use the start script from package.json
CMD [ "bun", "run", "start" ]
