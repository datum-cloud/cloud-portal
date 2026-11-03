# Code Quality

This document covers the tools and practices for maintaining code quality.

---

## Overview

| Tool                   | Purpose         | Config                    |
| ---------------------- | --------------- | ------------------------- |
| **ESLint**             | Linting         | `eslint.config.mjs`       |
| **Prettier**           | Code formatting | `prettier.config.mjs`     |
| **TypeScript**         | Type checking   | `tsconfig.json`           |
| **Lefthook**           | Git hooks       | `lefthook.yml`            |
| **dependency-cruiser** | Import layering | `.dependency-cruiser.cjs` |

---

## Commands

### Quick Reference

```bash
# Linting
pnpm lint              # Lint and auto-fix (local use)
pnpm lint:check        # Lint without fixing (CI)
pnpm depcruise         # Check import layering (CI)

# Formatting
pnpm format            # Format all files
pnpm format:check      # Check formatting (CI)

# Type Checking
pnpm typecheck         # Run TypeScript compiler

# All checks
pnpm lint:check && pnpm format:check && pnpm depcruise && pnpm typecheck
```

---

## ESLint

### Configuration

ESLint is configured in `eslint.config.mjs` (flat config) with:

- typescript-eslint's `recommendedTypeChecked` rules, type-aware against `tsconfig.json`
- `eslint-plugin-react` and `eslint-plugin-react-hooks` recommended rules
- `prettier/prettier`, so formatting drift is a lint error
- `unused-imports` for unused imports and variables
- Repo-specific `no-restricted-syntax` and `no-restricted-imports` rules

Import order is handled by Prettier (`@trivago/prettier-plugin-sort-imports`), not ESLint.

### Running Lint

```bash
# Lint with auto-fix
pnpm lint

# Lint specific files
pnpm exec eslint "app/routes/**/*.tsx" --fix
```

### Key Rules

| Rule                                      | Level | Description                                                                            |
| ----------------------------------------- | ----- | -------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-floating-promises` | error | Await a promise, `.catch()` it, or mark it fire-and-forget with `void`                 |
| `@typescript-eslint/no-misused-promises`  | error | Don't pass an async function where a void callback is expected (JSX attributes exempt) |
| `prettier/prettier`                       | error | Code must match `prettier.config.mjs`                                                  |
| `react-hooks/rules-of-hooks`              | error | Hooks are only called at the top level of components and hooks                         |
| `unused-imports/no-unused-imports`        | error | No unused imports                                                                      |
| `no-restricted-syntax`                    | error | Text sizes come from the datum-ui type scale and `<Text>` components                   |
| `no-restricted-imports`                   | error | GraphQL operations go through `runGqlQuery` / `runGqlMutation`                         |
| `react-hooks/exhaustive-deps`             | warn  | Effect and memo dependency arrays list what they read                                  |
| `unused-imports/no-unused-vars`           | warn  | No unused variables; prefix with `_` to keep one on purpose                            |
| `no-console`                              | warn  | Log through `app/modules/logger` (the logger itself is exempt)                         |
| Other `recommendedTypeChecked` rules      | warn  | `no-explicit-any`, `no-unsafe-*`, `require-await` and the rest                         |

Rules at `warn` had existing hits when they were turned on. `eslint.config.mjs` notes each one's starting count; drive them down and promote a rule to `error` once it reaches zero. CI fails on errors, not warnings.

The two promise rules are warnings in the auth, RBAC and server paths, which are being reworked separately. In test files only `no-misused-promises` drops to a warning, because an async `mockImplementation()` on a mock typed `ReturnType<typeof vi.fn>` reads as a void callback; `no-floating-promises` stays an error there.

The Lefthook pre-commit hook runs `eslint --fix`, so autofixable warnings (for example `no-unnecessary-type-assertion`) get fixed in every file you commit.

### Disabling Rules

```typescript
// Single line
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response;

// Block
/* eslint-disable @typescript-eslint/no-explicit-any */
// ... code
/* eslint-enable @typescript-eslint/no-explicit-any */

// File-level (at top)
/* eslint-disable @typescript-eslint/no-explicit-any */
```

**Note:** Prefer fixing the issue over disabling rules.

---

## Prettier

### Configuration

Prettier is configured in `prettier.config.mjs`. The main settings are `printWidth: 100`, `singleQuote: true`, `trailingComma: 'es5'` and `bracketSameLine: true`, plus two plugins: `@trivago/prettier-plugin-sort-imports` (import order) and `prettier-plugin-tailwindcss` (class order). Paths Prettier skips are listed in `.prettierignore`.

### Running Format

```bash
# Format all files
pnpm format

# Format specific files
pnpm exec prettier --write "app/routes/**/*.tsx"

# Check without writing
pnpm format:check
```

### Editor Integration

Install Prettier extension and enable "Format on Save":

**VS Code settings:**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

---

## TypeScript

### Configuration

TypeScript is configured in `tsconfig.json` with strict mode enabled.

### Running Type Check

```bash
pnpm typecheck
```

This runs:

1. `react-router typegen` - Generate route types
2. `./node_modules/typescript-native/bin/tsc` - the native TypeScript 7 compiler

### Native Compiler (`typescript-native`)

Two TypeScript packages are installed side by side:

| devDependency       | Resolves to                          | Used for                                                      |
| ------------------- | ------------------------------------ | ------------------------------------------------------------- |
| `typescript`        | real `typescript@^6.0.3` (classic)   | `typescript-eslint` and editor/language-server integrations   |
| `typescript-native` | `npm:typescript@^7.0.2` (native, Go) | `pnpm typecheck` and the Lefthook pre-commit `typecheck` hook |

`typescript` stays on 6.x deliberately: `typescript-eslint` (and VS Code's
built-in TypeScript language server) need the classic JS compiler API, which
TypeScript 7 removed. `typescript-native` gives us the ~5x faster native `tsc`
for the type-check gate without touching that API surface.

**Both packages declare a `tsc` (and `tsserver`) bin**, so
`node_modules/.bin/tsc` and `pnpm exec tsc` are **nondeterministic** — they resolve
to whichever package happened to install its bin symlink last, not
necessarily the one you want. Never call `tsc` or `pnpm exec tsc` bare. Always use
an explicit path:

```bash
./node_modules/typescript-native/bin/tsc   # fast native 7.x compiler
./node_modules/typescript/bin/tsc          # classic 6.x compiler
```

This is why `package.json`'s `typecheck` script and `lefthook.yml`'s
`typecheck` hook both call `./node_modules/typescript-native/bin/tsc`
explicitly instead of plain `tsc`.

**Why not Microsoft's official dual-alias pattern** (`typescript: npm:@typescript/typescript6@^6.x` + `@typescript/native: npm:typescript@^7.x`)?
That's the pattern Microsoft documents for this transition, but it hits a
reproducible Bun 1.3.14 bug: the `@typescript/typescript6` shim's own nested
dependency (`@typescript/old: npm:typescript@^6`, meant to point at the real
classic compiler) gets resolved by Bun back to the shim itself, in a circular
loop. The practical effect: `require('typescript')` returns an empty object
and the `tsc6` fallback binary silently no-ops on every invocation. See the
"Record: the Bun bug (minimal repro)" section in PR
[#1401](https://github.com/datum-cloud/cloud-portal/pull/1401) for the full
repro (reproduced in an isolated scratch project, independent of this repo's
other dependencies). The two-separate-packages setup above sidesteps the bug
entirely by never aliasing `typescript` itself.

**Collapse plan:** once `typescript-eslint` supports the TypeScript 7.1 API
(tracked for ~Oct 2026), drop `typescript-native` and move `typescript` to
`^7.1` directly. Optional in the meantime: install the "TypeScript (Native
Preview)" VS Code extension for a faster native editor LSP.

### Strict Mode Rules

| Option             | Effect                         |
| ------------------ | ------------------------------ |
| `strict: true`     | Enable all strict checks       |
| `noImplicitAny`    | Error on implicit `any`        |
| `strictNullChecks` | Nullable types must be handled |

### Handling Type Errors

```typescript
// Bad: Using any
const data: any = response;

// Good: Define proper type
interface ApiResponse {
  items: Organization[];
}
const data: ApiResponse = response;

// Good: Use unknown + type guard
const data: unknown = response;
if (isApiResponse(data)) {
  // data is typed here
}
```

### Type Assertions

```typescript
// Avoid: Type assertion
const org = data as Organization;

// Prefer: Type guard
function isOrganization(obj: unknown): obj is Organization {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}

if (isOrganization(data)) {
  // data is Organization
}
```

---

## Git Hooks (Lefthook)

### Configuration

Git hooks are configured in `lefthook.yml`:

```yaml
pre-commit:
  parallel: true
  commands:
    eslint:
      glob: '*.{js,jsx,ts,tsx}'
      run: pnpm exec eslint {staged_files} --fix
      auto_add: true
    prettier:
      glob: '*.{js,jsx,ts,tsx,json}'
      run: pnpm exec prettier --write {staged_files}
      auto_add: true
    typecheck:
      glob: '*.{ts,tsx}'
      run: ./node_modules/typescript-native/bin/tsc --noEmit
      stage_fixed: false
```

### How It Works

On `git commit`:

1. ESLint fixes staged `.js/.jsx/.ts/.tsx` files
2. Prettier formats staged `.js/.jsx/.ts/.tsx/.json` files
3. The native TypeScript compiler type-checks the project
4. If any fail, commit is blocked

The hook does not format `.md` or `.css` files, but `pnpm format:check` in CI does. Run `pnpm format` before committing changes to those files.

### Bypassing Hooks

```bash
# Skip hooks (not recommended)
git commit --no-verify -m "message"
```

**Note:** Only bypass for emergencies. Fix the issue properly.

---

## Import Conventions

### Import Order

Prettier sorts imports on format (`@trivago/prettier-plugin-sort-imports`). Do not order them by hand; run `pnpm format` or let the pre-commit hook do it.

### Import Aliases

Use the `@/` alias (maps to `app/`) instead of deep relative paths. UI components come from the `@datum-cloud/datum-ui` package:

```typescript
// Good
import { Button } from '@datum-cloud/datum-ui/button';
import { env } from '@/utils/env';

// Avoid
import { env } from '../../utils/env';
```

---

## Import Layering (dependency-cruiser)

`.dependency-cruiser.cjs` enforces which parts of `app/` may import which:

| Rule                        | Forbids                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `resources-not-to-routes`   | `app/resources` importing `app/routes`                                                          |
| `resources-not-to-features` | `app/resources` importing `app/features`                                                        |
| `features-not-to-routes`    | `app/features` importing `app/routes`                                                           |
| `modules-not-to-routes`     | `app/modules` importing `app/routes`                                                            |
| `modules-not-to-features`   | `app/modules` importing `app/features`                                                          |
| `client-not-to-server`      | Code outside `server/` directories, `*.server.ts` and `entry.server.tsx` importing `app/server` |
| `no-circular`               | Circular imports                                                                                |

Routes may import anything. Tests are exempt from the layering rules.

Violations that existed when the check was added are listed in `.dependency-cruiser-known-violations.json`, and `pnpm depcruise` skips them (`--ignore-known`). Each entry names one import edge (and, for a cycle, the whole cycle path), so a new import from a file that is already listed still fails CI. A known cycle is matched by its full path: changing an import inside an existing cycle can report it again, and if the cycle is still expected, regenerate the baseline. After removing old violations, regenerate the baseline so it can't grow back:

```bash
pnpm exec depcruise app --output-type baseline > .dependency-cruiser-known-violations.json
```

---

## Best Practices

### File Naming

| Type       | Convention           | Example               |
| ---------- | -------------------- | --------------------- |
| Components | PascalCase           | `PageHeader.tsx`      |
| Hooks      | camelCase with `use` | `useOrganizations.ts` |
| Utilities  | camelCase            | `formatDate.ts`       |
| Types      | PascalCase           | `Organization.ts`     |
| Constants  | SCREAMING_SNAKE      | `API_ENDPOINTS.ts`    |

### Component Structure

```typescript
// 1. Imports
import { useState } from 'react';

// 2. Types
interface Props {
  title: string;
  onSubmit: () => void;
}

// 3. Component
export function MyComponent({ title, onSubmit }: Props) {
  // Hooks first
  const [state, setState] = useState('');

  // Handlers
  const handleClick = () => {
    // ...
  };

  // Render
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleClick}>Submit</button>
    </div>
  );
}
```

### Avoid

- `any` types - use `unknown` with type guards
- Magic numbers - use named constants
- Deeply nested code - extract functions
- Large files - split into modules
- Console.log in production - use logger

---

## CI/CD Integration

Quality checks run in `.github/workflows/ci.yml`:

| Job             | Command                                                  |
| --------------- | -------------------------------------------------------- |
| `Lint & Format` | `pnpm lint:check && pnpm format:check && pnpm depcruise` |
| `Type Check`    | `pnpm typecheck`                                         |
| `Build`         | `pnpm build`                                             |

Neither lint, format nor depcruise writes files in CI, so any ESLint error, unformatted file or new layering violation fails the job. ESLint warnings do not fail it.

---

## Troubleshooting

### ESLint Not Finding Config

```bash
# Verify config exists
ls eslint.config.mjs

# Run with debug
DEBUG=eslint:* pnpm exec eslint app/
```

### Prettier/ESLint Conflicts

ESLint runs Prettier through `prettier/prettier` with the same `prettier.config.mjs`, so the two agree. To fix both locally:

```bash
pnpm lint && pnpm format
```

### TypeScript Errors After Refactor

```bash
# Regenerate route types
pnpm typecheck

# If still failing, restart TS server
# VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## Related Documentation

- [Testing](./testing.md) - Test quality
- [Project Structure](./project-structure.md) - Code organization
