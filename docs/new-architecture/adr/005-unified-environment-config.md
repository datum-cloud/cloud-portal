# ADR-005: Unified Environment Config

**Status:** Accepted
**Date:** 2026-01-03

---

## Context

Environment variable access was scattered throughout the codebase:

1. **`process.env.X` everywhere** - No validation, runtime errors
2. **No client/server separation** - Easy to leak secrets
3. **Multiple config files** - `env.config.ts`, `env.client.ts`, `env.server.ts`
4. **No fail-fast** - Missing vars discovered at runtime

Common issues:

- Typos in env var names caused runtime crashes
- Server secrets accidentally bundled in client code
- No clear distinction between public and private vars
- Inconsistent access patterns across modules

## Decision

Create a unified environment configuration with Zod validation and namespaced access (`env.public.*` and `env.server.*`).

### Technical Details

**New structure:**

```
app/utils/env/
├── env.server.ts    # Server-side validation and export
├── types.ts         # Zod schemas and types
└── index.ts         # Re-exports for universal access
```

**API design:**

```typescript
// Public vars (safe for client)
env.public.appUrl; // e.g., "https://cloud.example.com"
env.public.apiUrl; // e.g., "https://api.example.com"
env.public.sentryDsn; // Public Sentry DSN

// Server-only vars (never bundled in client)
env.server.sessionSecret;
env.server.zitadelClientId;
env.server.zitadelClientSecret;
```

**Zod validation:**

```typescript
const publicEnvSchema = z.object({
  appUrl: z.string().url(),
  apiUrl: z.string().url(),
  // ...
});

const serverEnvSchema = z.object({
  sessionSecret: z.string().min(32),
  // ...
});
```

### Before vs After

| Aspect         | Before                | After                           |
| -------------- | --------------------- | ------------------------------- |
| Access pattern | `process.env.X`       | `env.public.X` / `env.server.X` |
| Validation     | None (runtime errors) | Zod (fail-fast on startup)      |
| Type safety    | None                  | Full TypeScript inference       |
| Client safety  | Manual (error-prone)  | Namespace enforced              |
| Config files   | 3 scattered files     | 1 unified module                |

## Rationale

Unified env config was chosen because:

1. **Fail-fast** - Missing/invalid vars caught at startup
2. **Type safety** - Full IntelliSense for env vars
3. **Clear separation** - Namespaces prevent accidental leaks
4. **Single import** - `import { env } from '@/utils/env'`
5. **Validation** - Zod ensures correct types and formats

## Alternatives Considered

### Option A: Keep process.env

- **Pros:** No migration effort
- **Cons:** No validation, no type safety
- **Why rejected:** Runtime errors too common

### Option B: dotenv with validation

- **Pros:** Simple, well-known
- **Cons:** No namespace separation, manual types
- **Why rejected:** Doesn't prevent client leaks

### Option C: Third-party config library

- **Pros:** Feature-rich
- **Cons:** Another dependency, may not fit React Router
- **Why rejected:** Custom solution is simpler

## Consequences

### Positive

- App fails immediately if required vars missing
- TypeScript catches typos in env var names
- Clear separation prevents secret leakage
- Single source of truth for all config
- Easy to add new env vars with validation

### Negative

- Migration effort (update all imports)
- New pattern for team to learn
- Zod adds to bundle (minimal)

### Risks & Mitigations

| Risk                   | Mitigation                      |
| ---------------------- | ------------------------------- |
| Team uses process.env  | ESLint rule, code review        |
| Missing env on deploy  | CI validation, startup check    |
| Breaking existing code | Gradual migration, clear errors |

## References

- [Zod Documentation](https://zod.dev/)
