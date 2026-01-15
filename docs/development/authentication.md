# Authentication & Authorization

This document explains how authentication and authorization work in the Cloud Portal.

---

## Overview

The Cloud Portal uses **OpenID Connect (OIDC)** for authentication and **Role-Based Access Control (RBAC)** for authorization.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────►│ Cloud Portal│────►│    OIDC     │
│             │◄────│   (Hono)    │◄────│  Provider   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Control     │
                    │ Plane API   │
                    └─────────────┘
```

---

## Authentication Flow

### 1. Login Initiation

User clicks "Login" → redirected to OIDC provider:

```
/login → OIDC Provider → /auth/callback
```

### 2. OIDC Callback

After successful authentication:

1. OIDC provider redirects to `/auth/callback` with authorization code
2. Server exchanges code for tokens (access token, refresh token, ID token)
3. Session created with tokens
4. User redirected to dashboard

### 3. Session Management

Sessions are managed server-side:

```typescript
// Session structure
interface Session {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
    name: string;
  };
}
```

---

## Configuration

### Environment Variables

```env
# Required
AUTH_OIDC_ISSUER=https://your-oidc-provider.com
AUTH_OIDC_CLIENT_ID=your-client-id

# Required (server-side only)
SESSION_SECRET=minimum-32-character-secret-key
```

### OIDC Provider Setup

Your OIDC provider must have:

- **Redirect URI:** `http://localhost:3000/auth/callback` (dev)
- **Redirect URI:** `https://cloud.datum.net/auth/callback` (prod)
- **Scopes:** `openid profile email`

---

## Session Middleware

The session middleware validates authentication on each request:

```typescript
// app/server/middleware/auth.ts
export function sessionMiddleware() {
  return async (c: Context, next: Next) => {
    const session = await getSession(c);

    if (session && isSessionValid(session)) {
      c.set('session', session);
    }

    await next();
  };
}
```

---

## Accessing Session in Code

### In Loaders (Server-Side)

```typescript
export async function loader({ context }: Route.LoaderArgs) {
  const { session } = context;

  // Redirect if not authenticated
  if (!session) {
    throw redirect('/login');
  }

  // Use access token for API calls
  const data = await fetchWithToken(session.accessToken);

  return { data, user: session.user };
}
```

### Session Properties in Context

| Property | Type | Description |
|----------|------|-------------|
| `session` | `Session \| null` | Current user session |
| `session.accessToken` | `string` | JWT for API calls |
| `session.user` | `User` | User info (id, email, name) |

---

## Authorization (RBAC)

### How RBAC Works

1. Roles are defined in the Control Plane
2. Users are assigned roles (directly or via groups)
3. Portal checks permissions before showing features

### Checking Permissions

Use the `access-review` resource to check permissions:

```typescript
import { checkAccess } from '@/resources/access-review';

// Check if user can create DNS zones
const canCreate = await checkAccess({
  action: 'create',
  resource: 'dns-zones',
  scope: { projectId: currentProject.id },
});

if (!canCreate) {
  // Hide or disable the feature
}
```

### Role Hierarchy

```
Organization Owner
       │
       ▼
Organization Admin
       │
       ▼
Project Owner
       │
       ▼
Project Admin
       │
       ▼
Project Member (Viewer)
```

---

## Protected Routes

### Route-Level Protection

```typescript
// In loader
export async function loader({ context }: Route.LoaderArgs) {
  const { session } = context;

  if (!session) {
    // Redirect to login with return URL
    const url = new URL(request.url);
    throw redirect(`/login?returnTo=${url.pathname}`);
  }

  return { user: session.user };
}
```

### Component-Level Protection

```typescript
function AdminPanel() {
  const { user, permissions } = useLoaderData();

  if (!permissions.includes('admin')) {
    return <AccessDenied />;
  }

  return <AdminContent />;
}
```

---

## Token Handling

### Token Refresh

Tokens are automatically refreshed when they expire:

```typescript
// Handled by auth middleware
if (isTokenExpired(session.accessToken)) {
  const newTokens = await refreshTokens(session.refreshToken);
  await updateSession(newTokens);
}
```

### Token Injection for API Calls

Tokens are automatically injected into API calls via `AsyncLocalStorage`:

```typescript
// In server/middleware/request-context.ts
export function requestContextMiddleware() {
  return async (c: Context, next: Next) => {
    const session = c.get('session');

    // Store token in AsyncLocalStorage
    await runWithContext({
      token: session?.accessToken,
      requestId: c.get('requestId'),
    }, next);
  };
}
```

This allows generated API clients to automatically include auth:

```typescript
// This automatically includes the token
const orgs = await getOrganizations();
```

---

## Logout

### Logout Flow

1. User clicks "Logout"
2. Session destroyed on server
3. Redirect to OIDC provider's logout endpoint
4. Redirect back to login page

```typescript
// Logout route
app.get('/logout', async (c) => {
  await destroySession(c);

  const logoutUrl = new URL('/logout', AUTH_OIDC_ISSUER);
  logoutUrl.searchParams.set('post_logout_redirect_uri', APP_URL);

  return c.redirect(logoutUrl.toString());
});
```

---

## Security Best Practices

### Session Security

- Sessions stored server-side only
- `SESSION_SECRET` must be 32+ characters
- Secure cookies in production (HTTPS only)
- HttpOnly cookies (no JS access)

### Token Security

- Access tokens never exposed to client JS
- Refresh tokens stored server-side only
- Short token expiration (15 min)
- Automatic refresh before expiry

### CSRF Protection

- SameSite cookies enabled
- CSRF tokens for mutations
- Origin validation

---

## Troubleshooting

### "Unauthorized" Errors

1. Check session exists: `context.session`
2. Verify token not expired
3. Check API_URL is correct
4. Verify OIDC configuration

### Login Redirect Loop

1. Check redirect URI in OIDC provider
2. Verify `AUTH_OIDC_ISSUER` is correct
3. Check browser cookies are enabled

### Token Refresh Failing

1. Check refresh token not expired
2. Verify OIDC provider is accessible
3. Check `SESSION_SECRET` hasn't changed

---

## Related Documentation

- [Environment Setup](../getting-started/02-environment-setup.md) - Auth configuration
- [ADR-005: Unified Environment Config](../architecture/adrs/005-unified-environment-config.md)
