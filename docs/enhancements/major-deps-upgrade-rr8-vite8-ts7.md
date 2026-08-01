# Major Dependency Upgrade: React Router 8 / Vite 8 / TypeScript 7

- **Date:** 2026-08-01
- **Status:** Approved
- **Branch:** `yahyafakhroji/major-deps`
- **Strategy:** Two sequential PRs (Option A)

## Context

Renovate has five open major-upgrade PRs. Research showed four of the majors form
one atomic group that must land together, while TypeScript 7 is independent:

```
react-router 8 ──requires──▶ react-router-hono-server 3   (v2 peer caps at @react-router/dev ^7.9)
hono-server 3  ──requires──▶ vite >= 8.0.16               (hard peer, not optional)
vite 8         ──requires──▶ @vitejs/plugin-react 6       (v6 peers vite ^8; v5 cannot run on 8)
```

Drivers:

- **Security:** GHSA-qwww-vcr4-c8h2 (CSRF in RSC mode, CVSS 7.1) is only patched in
  `react-router@8.3.0`; no 7.x backport exists. This repo does not use RSC APIs, so
  it is not exploitable today, but v7 no longer receives fixes.
- **Existing inconsistency:** the pinned `remix-utils@10.0.0` already peer-requires
  `react-router ^8` (currently violated).
- **Stale deferral:** Vite 8 was deferred in May 2026 (PR #1083 closed) pending
  Cypress support and rolldown SSR maturity. Both blockers are resolved (Cypress
  15.14+ ships Vite 8 CT support; we run 15.19). Because the PR was closed,
  Renovate silently ignores all Vite 8.x releases — this work restores coverage.

## Ecosystem readiness (researched 2026-08-01)

| Concern | Status |
|---|---|
| Cypress component testing on Vite 8 | ✅ Shipped in 15.14.0; we run 15.19.0 (includes HMR/support-file follow-up fixes) |
| `cypress-vite` e2e preprocessor | ✅ 1.10.2 (pinned) already peers `vite ^8` |
| `@tailwindcss/vite` 4.3.x, `vite-tsconfig-paths` 6.x | ✅ In range for Vite 8 |
| `@react-router/dev` rolldown config detection | ✅ Fixed in RR 8.1.0; target 8.3.0 |
| Sentry vite plugin on Vite 8 | ⚠️ Reported ~5× build-time regression (sentry-javascript#20100, closed, fix version undocumented) — benchmark required |
| rolldown SSR tree-shaking | ⚠️ Strips side-effect-only imports under `"sideEffects": false` (rolldown-vite#608) — audit required |
| `manualChunks` object form | ❌ Rejected by Vite 8 compat layer — must migrate to `rolldownOptions.output.codeSplitting` |
| typescript-eslint on TS 7 | ❌ No support until TS 7.1 API (~Oct 2026); peer range caps at `<6.1.0` — dual-alias required |
| TS7 for `tsc`, Cypress 15.19, hey-api, prettier, Bun, RR typegen | ✅ All compatible |

## PR-1 — Platform group

### Manifest changes (`package.json`, one `bun install`)

| Package | Change |
|---|---|
| `react-router`, `@react-router/dev`, `@react-router/node` | `^7.18.0` → `^8.3.0` |
| `@react-router/serve` | **remove** (imported nowhere; app serves via hono-server + `server.ts`) |
| `react-router-hono-server` | `^2.26.0` → `^3.0.0` |
| `vite` | `^7.3.5` → `^8.2.0` |
| `@vitejs/plugin-react` | `^5.2.0` → `^6.0.5` |
| `nuqs` | `^2.8.9` → `^2.9.4` |
| `@sentry/react-router` | `^10.59.0` → `^10.69.0` |

`remix-utils@10.0.0` unchanged — its `react-router ^8` peer becomes satisfied.

### Code changes

1. **`app/root.tsx`:** nuqs adapter import `nuqs/adapters/react-router/v7` → `.../v8`.
2. **`vite.config.ts`:**
   - Migrate object-form `manualChunks` to `build.rolldownOptions.output.codeSplitting`
     groups (same five vendor groups). Preserve the `isCypress` guard. Drop the
     `rollup` `ManualChunksOption` type import.
   - Attempt removal of `patchHonoBunAdapter()` and its companion
     `ssr.noExternal: ['hono']` (both written for hono-server 2.25 module-runner
     behavior). Keep only if dev-server boot still crashes under v3.
   - Re-test the CYPRESS-gated dynamic import of `@react-router/dev/vite`
     (tsx/esbuild re-entrancy workaround tied to RR 7.18 chunk layout); simplify if
     obsolete under RR 8.
3. **Side-effect import audit:** root `package.json` sets `"sideEffects": false` and
   rolldown SSR tree-shaking strips bare `import './x'` statements. Sweep
   `server.ts`, `observability/`, and `*.server.ts` for side-effect-only imports;
   convert findings to explicit exported init calls.
4. **`splitRouteModules`:** RR8 flips the default to `true`. Accept the new default;
   fall back to `false` only if e2e or bundle checks regress.

### Verification gates (agreed with owner)

- Full CI green: typecheck, lint, `bun test`, Cypress e2e + component suites.
- Manual dev-workflow smoke: dev-server boot + HMR, `bun run openapi`,
  `bun run graphql`, `bun run build && bun run preview` against the **production**
  server bundle (tree-shaking risk lives there), login/session persistence
  (RR8 swapped cookie internals to `cookie-es`; signed `_session` cookies must
  round-trip).
- Benchmark CI build duration before/after (Sentry plugin regression watch);
  eyeball chunk output for the five vendor groups.

### Bot-PR effects

Auto-closes Renovate #1396, #1395, #1380. Manually close Dependabot #1384.
Landing Vite 8 lifts Renovate's closed-PR ignore on the 8.x line.

## PR-2 — TypeScript 7 (dual alias), immediately after PR-1 merges

### Manifest changes (devDependencies)

```jsonc
"typescript": "npm:@typescript/typescript6@^6.0.2",  // JS API line: typescript-eslint, editors
"@typescript/native": "npm:typescript@^7.0.2"        // native `tsc` bin (typescript6 ships only `tsc6` — no collision)
```

This is the official Microsoft transition pattern (same setup as Angular).
Rationale: `typescript@7` removed the JS compiler API entirely;
`@typescript-eslint/parser` requires that API for **all** TS parsing (not just
type-aware rules), so a lone `typescript@7` kills the whole lint run. Our ESLint
config is maximal (type-aware `recommendedTypeChecked` with `project`), so the
`typescript` name must resolve to a 6.x API until typescript-eslint adopts the
TS 7.1 API.

### Work items

1. `bun run typecheck` unchanged (`react-router typegen && tsc`) — `tsc` becomes
   the native binary (~8–12× faster).
2. One-time `tsc` vs `tsc6` diagnostic diff before trusting CI; fix any
   newly-surfaced errors (expect ordering/UTF-8-column churn, possible stricter
   conflicting-declaration errors).
3. Flush any stale `*.tsbuildinfo` (likely none — `noEmit`).
4. Docs note (README or CONTRIBUTING): what the alias is, why, and that the
   VS Code "TypeScript (Native Preview)" extension is optional per-dev (default
   editor experience stays on the 6.x language server).
5. `package.json` cannot carry comments — document the alias in the PR
   description and the docs note instead.

### Verification gates

Same CI gates as PR-1. Behavior must be identical: assert zero lint diff and
typecheck parity via the `tsc`/`tsc6` diff.

### Bot-PR effects

Closes Renovate #1345.

## Accepted trade-offs (dual alias)

- CI gate checks with 7.0 while editors/lint see the 6.0 API — rare divergence
  possible; mitigated by the one-time diagnostic diff.
- `package.json` reads "6" while `tsc --version` says 7 — documented in PR + docs.
- Version-detection edge: tools inspecting the `typescript` package see 6.0.2.
  Fine today (everything accepts 6); revisit if a future dep peer-requires `>=7`.
- Editor speedup is opt-in per-dev via the Native Preview extension.
- The alias requires a manual collapse step at TS 7.1 (tracked below).

## Out of scope

- `ioredis` 5 → 6 (released 2026-07-31; let it bake — Renovate #1397 stays open).
- `react-dropzone` 15 → 19 (blocked: `@datum-cloud/datum-ui` peers `>=15 <16` and
  the portal uses its Dropzone in DNS-record import — needs a datum-ui release
  first; Renovate #1394 stays open).
- Minor/patch batch (separate trivial PR; `bun update` covers in-range drift).
- Dropping `vite-tsconfig-paths` for native `resolve.tsconfigPaths` (follow-up).
- Lint-stack migration (oxlint + tsgolint) — evaluated, deferred; not a rider on
  this upgrade.
- Renovate config edits.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Sentry vite plugin ~5× build slowdown on Vite 8 | Benchmark CI build; worst case gate the plugin to release builds only |
| rolldown SSR tree-shaking drops server side-effect imports | Audit + prod-bundle smoke is a hard gate |
| rolldown chunk-ordering bug (module side-effect order) | Prod-build smoke; vendor groups are coarse, low exposure |
| Lightning CSS becomes default minifier | Quick visual pass on built CSS |
| Higher dev-mode memory under rolldown | Note to team; not a blocker |
| Signed session cookies fail after `cookie-es` swap | Login persistence in smoke pass |
| CI-vs-editor diagnostic divergence (TS 6 vs 7) | One-time `tsc`/`tsc6` diff; port is semantics-identical by design |

## Follow-ups (tracked)

1. **TS 7.1 (~Oct 2026):** collapse the dual alias to `typescript: ^7.1` once
   typescript-eslint ships native support; also unblocks eslint core.
2. Migrate `vite-tsconfig-paths` → native `resolve.tsconfigPaths: true`.
3. datum-ui: widen `react-dropzone` peer to unblock v19 (portal-side no-op).
4. Revisit `ioredis@6` after patch releases stabilize.
5. Optional: evaluate oxlint + tsgolint for a typescript-package-free lint stack.

## Key references

- Renovate PRs: #1396 (RR8 monorepo), #1395 (hono-server 3), #1380 (RR8 security),
  #1345 (TS7), #1397 (ioredis), #1394 (react-dropzone); Dependabot #1384;
  closed #1083/#1082 (Vite 8 / plugin-react 6, May 2026 deferral); merged #1265
  (Vite 8 `ManualChunksOption` type prep).
- GHSA-qwww-vcr4-c8h2 · vite.dev/guide/migration · rolldown-vite#608 ·
  sentry-javascript#20100 · typescript-eslint#12518 / #10940 ·
  microsoft/typescript-go CHANGES.md · cypress#33078 (resolved 15.14.0).
