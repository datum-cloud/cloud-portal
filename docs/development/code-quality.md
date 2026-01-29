# Code Quality

This document covers the tools and practices for maintaining code quality.

---

## Overview

| Tool           | Purpose         | Config             |
| -------------- | --------------- | ------------------ |
| **ESLint**     | Linting         | `eslint.config.js` |
| **Prettier**   | Code formatting | `.prettierrc`      |
| **TypeScript** | Type checking   | `tsconfig.json`    |
| **Lefthook**   | Git hooks       | `lefthook.yml`     |

---

## Commands

### Quick Reference

```bash
# Linting
bun run lint              # Lint and auto-fix

# Formatting
bun run format            # Format all files
bun run format:check      # Check formatting (CI)

# Type Checking
bun run typecheck         # Run TypeScript compiler

# All checks
bun run lint && bun run format:check && bun run typecheck
```

---

## ESLint

### Configuration

ESLint is configured in `eslint.config.js` with:

- TypeScript support
- React/React Hooks rules
- Import sorting
- Accessibility (jsx-a11y)

### Running Lint

```bash
# Lint with auto-fix
bun run lint

# Lint specific files
bunx eslint "app/routes/**/*.tsx" --fix
```

### Key Rules

| Rule                                 | Description                |
| ------------------------------------ | -------------------------- |
| `@typescript-eslint/no-explicit-any` | Disallow `any` type        |
| `react-hooks/rules-of-hooks`         | Enforce hooks rules        |
| `react-hooks/exhaustive-deps`        | Verify dependency arrays   |
| `import/order`                       | Consistent import ordering |

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

Prettier config in `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSameLine": true
}
```

### Running Format

```bash
# Format all files
bun run format

# Format specific files
bunx prettier --write "app/routes/**/*.tsx"

# Check without writing
bun run format:check
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
bun run typecheck
```

This runs:

1. `react-router typegen` - Generate route types
2. `tsc` - TypeScript compiler

### Strict Mode Rules

| Option             | Effect                         |
| ------------------ | ------------------------------ |
| `strict: true`     | Enable all strict checks       |
| `noImplicitAny`    | Error on implicit `any`        |
| `strictNullChecks` | Nullable types must be handled |
| `noUnusedLocals`   | Error on unused variables      |

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
    lint:
      glob: '*.{ts,tsx}'
      run: bunx eslint {staged_files} --fix
    format:
      glob: '*.{ts,tsx,json,css,md}'
      run: bunx prettier --write {staged_files}
    types:
      run: bun run typecheck
```

### How It Works

On `git commit`:

1. ESLint runs on staged `.ts/.tsx` files
2. Prettier formats staged files
3. TypeScript check runs
4. If any fail, commit is blocked

### Bypassing Hooks

```bash
# Skip hooks (not recommended)
git commit --no-verify -m "message"
```

**Note:** Only bypass for emergencies. Fix the issue properly.

---

## Import Conventions

### Import Order

Imports should be ordered:

1. External packages
2. Internal aliases (`@/`, `@shadcn/`, `@datum-ui/`)
3. Relative imports
4. Type imports

```typescript
// 1. External
// 3. Relative
import { PageHeader } from './components/page-header';
import { useOrganizations } from '@/resources/organizations';
// 4. Types
import type { Organization } from '@/resources/organizations';
import { DataTable } from '@datum-ui/components/data-table';
// 2. Internal aliases
import { Button } from '@shadcn/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
```

### Import Aliases

Use aliases instead of relative paths:

```typescript
// Good
import { Button } from '@shadcn/ui/button';
import { env } from '@/utils/env';

// Avoid
import { Button } from '../../../modules/shadcn/ui/button';
import { env } from '../../utils/env';
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

Quality checks run in GitHub Actions:

```yaml
# .github/workflows/quality-checks.yml
jobs:
  quality:
    steps:
      - name: Lint
        run: bun run lint

      - name: Format Check
        run: bun run format:check

      - name: Type Check
        run: bun run typecheck
```

PRs are blocked if any check fails.

---

## Troubleshooting

### ESLint Not Finding Config

```bash
# Verify config exists
ls eslint.config.js

# Run with debug
DEBUG=eslint:* bunx eslint app/
```

### Prettier/ESLint Conflicts

Ensure Prettier runs after ESLint:

```bash
# In lefthook or CI
bun run lint && bun run format
```

### TypeScript Errors After Refactor

```bash
# Regenerate route types
bun run typecheck

# If still failing, restart TS server
# VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## Related Documentation

- [Testing](./testing.md) - Test quality
- [Project Structure](./project-structure.md) - Code organization
