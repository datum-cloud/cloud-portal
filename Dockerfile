# syntax=docker/dockerfile:1.10@sha256:865e5dd094beca432e8c0a1d5e1c465db5f998dca4e439981029b3b81fb39ed5

# ==========================================
# BASE STAGE - Common dependencies and setup
# ==========================================

FROM node:26.13.1-alpine3.24@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS base

# Fail the build if the compromised emSign ECC Root CA - G3 comes back. Node
# checks TLS against roots built into its binary, so test those; the system
# bundle only counts if --use-system-ca is ever turned on, so test it too.
RUN apk add --no-cache --upgrade 'ca-certificates>=20261020-r0'
RUN ! grep -q MIICTjCCAdOgAwIBAgIKPPYHqWhwDtqLhDAKBggqhkjOPQQDAzBrMQswCQYDVQQG /etc/ssl/certs/ca-certificates.crt
RUN node -e 'const tls = require("node:tls"); const { X509Certificate } = require("node:crypto"); if (tls.rootCertificates.some((pem) => new X509Certificate(pem).subject.split("\n").includes("CN=emSign ECC Root CA - G3"))) { console.error("Node trusts emSign ECC Root CA - G3"); process.exit(1); }'

# Remix app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=3000

# ==========================================
# BUILD STAGE - Compile and prepare the app
# ==========================================
FROM base AS build

ARG VERSION=dev

# Set environment variables
ENV VERSION=${VERSION}

# Install dependencies. Node 26 ships no corepack, so install the pnpm that
# package.json's packageManager pins; it stays in this stage only.
COPY --link package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g "$(node -p 'require("./package.json").packageManager')" --no-audit --no-fund && \
    pnpm install --frozen-lockfile --prod=false --ignore-scripts

# Copy application code
COPY --link . .

# Build application. The Sentry auth token (for source map upload) arrives as a
# BuildKit secret, so it never lands in image layers, history or provenance.
RUN --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
    pnpm build && \
    pnpm prune --prod --ignore-scripts && \
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

CMD [ "node", "--env-file-if-exists=.env", "./observability/start.js" ]
