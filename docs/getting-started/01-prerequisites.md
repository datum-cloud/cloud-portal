# Prerequisites

Before you can run the Datum Cloud Portal locally, ensure you have the following tools and access.

---

## Required Tools

### Node.js (Runtime)

Node.js is the JavaScript runtime used for this project. The pinned version is in `.nvmrc`.

```bash
# Verify installation
node --version  # Should be 26.12.1
```

### pnpm (Package Manager)

pnpm installs the dependencies. The pinned version is the `packageManager` field in `package.json`. Node 26 ships without corepack, so install pnpm yourself; once installed, pnpm switches to the pinned version on its own.

```bash
npm install -g pnpm@11
pnpm --version  # Should be 11.x
```

`.tool-versions` also pins pnpm for asdf and mise users.

### Git

```bash
git --version  # Should be >= 2.x
```

---

## Required Access

Before starting development, ensure you have:

- [ ] **GitHub access** to the `datum/cloud-portal` repository
- [ ] **OIDC credentials** from your authentication provider
- [ ] **Control Plane API access** for fetching OpenAPI specs (optional for initial setup)

---

## Recommended Tools

### IDE

- **VS Code** (recommended) with extensions:
  - ESLint
  - Prettier - Code formatter
  - Tailwind CSS IntelliSense
  - TypeScript Vue Plugin (Volar) - for better TS support

### Docker Desktop

Required for running the local observability stack (Grafana, Prometheus, Jaeger).

```bash
docker --version
docker-compose --version
```

---

## Checkpoint

Run this command to verify all required tools are installed:

```bash
node --version && pnpm --version && git --version
```

**Expected output:** All three version numbers displayed without errors.

---

## Next Step

Once prerequisites are met, proceed to [Environment Setup](./02-environment-setup.md).
