# Troubleshooting

This document covers common issues and debugging techniques.

---

## Quick Diagnostics

### Health Check

```bash
# Check if server is running
curl http://localhost:3000/health

# Check specific endpoints
curl http://localhost:3000/api/v1/user
```

### Log Inspection

```bash
# View server logs
bun run dev

# Filter errors
bun run dev 2>&1 | grep -i error
```

---

## Common Issues

### Build Issues

#### "Cannot find module" Error

**Symptom:**

```
Error: Cannot find module '@/components/...'
```

**Cause:** Path alias not configured or import typo.

**Solution:**

1. Check `tsconfig.json` paths configuration
2. Verify the file exists at the path
3. Run `bun install` to ensure dependencies are installed

---

#### TypeScript Errors After OpenAPI Generation

**Symptom:**

```
Type 'X' is not assignable to type 'Y'
```

**Cause:** Generated types changed after spec update.

**Solution:**

1. Review API spec changes
2. Update consuming code to match new types
3. Run `bun run typecheck` to find all errors

---

### Runtime Issues

#### Authentication Redirect Loop

**Symptom:** Browser keeps redirecting between app and auth server.

**Causes & Solutions:**

1. **Invalid callback URL:**

   ```bash
   # Check AUTH_URL matches your local address
   AUTH_URL=http://localhost:3000
   ```

2. **Session cookie not persisting:**

   ```bash
   # Ensure SESSION_SECRET is set
   SESSION_SECRET=your-32-character-secret-key
   ```

3. **Clock skew:**
   - Ensure system clock is synchronized
   - JWT tokens have time-based validation

---

#### "Failed to fetch" Errors

**Symptom:** API calls fail with network errors.

**Causes & Solutions:**

1. **API server not running:**

   ```bash
   # Check if gateway is accessible
   curl $CLOUD_GATEWAY_API_URL/health
   ```

2. **CORS issues:**
   - Check browser console for CORS errors
   - Verify API allows your origin

3. **Token expired:**
   - Logout and login again
   - Check token refresh is working

---

#### Real-time Updates Not Working

**Symptom:** Watch API / SSE not receiving updates.

**Causes & Solutions:**

1. **EventSource connection failed:**

   ```javascript
   // Check browser console for SSE errors
   // Look for: EventSource failed to connect
   ```

2. **Proxy not forwarding SSE:**
   - Check Vite proxy configuration
   - Ensure `changeOrigin: true` is set

3. **Token not passed:**
   - Verify auth header in SSE requests
   - Check network tab for 401 errors

---

### Development Issues

#### Hot Reload Not Working

**Symptom:** Changes not reflected without manual refresh.

**Solution:**

1. Check Vite dev server is running
2. Clear browser cache
3. Restart dev server: `bun run dev`

---

#### Styles Not Applying

**Symptom:** Tailwind classes have no effect.

**Causes & Solutions:**

1. **Class not in safelist:**
   - Check if class is dynamically generated
   - Add to Tailwind safelist if needed

2. **CSS layer order:**
   - Check `root.css` layer definition
   - Ensure theme layer comes after base

3. **Build cache:**
   ```bash
   # Clear Tailwind cache
   rm -rf node_modules/.cache
   bun run dev
   ```

---

#### Form Validation Not Showing

**Symptom:** Zod errors not displayed in form.

**Causes & Solutions:**

1. **Schema mismatch:**
   - Ensure field names match schema keys
   - Check for typos in `name` prop

2. **Missing error component:**
   ```tsx
   // Errors auto-display, but check Form.Field wrapper
   <Form.Field name="email" label="Email">
     <Form.Input type="email" />
   </Form.Field>
   ```

---

## Debugging Techniques

### React Query DevTools

```tsx
// Enable in development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Add to app root
<ReactQueryDevtools initialIsOpen={false} />;
```

Features:

- View cache state
- Inspect queries/mutations
- Trigger refetches
- Clear cache

---

### Network Debugging

```javascript
// Log all fetch requests
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  console.log('Fetch:', args);
  const response = await originalFetch(...args);
  console.log('Response:', response.status);
  return response;
};
```

---

### Tracing a Request

1. Open browser DevTools → Network tab
2. Find the failing request
3. Copy trace ID from response headers
4. Search in Jaeger: http://localhost:16686

---

### Server-Side Debugging

```typescript
// Add logging to loaders
export async function loader({ request }: LoaderFunctionArgs) {
  console.log('Loader called:', {
    url: request.url,
    headers: Object.fromEntries(request.headers),
  });

  try {
    const data = await fetchData();
    console.log('Data fetched:', data);
    return data;
  } catch (error) {
    console.error('Loader error:', error);
    throw error;
  }
}
```

---

## Error Messages Reference

### Authentication Errors

| Error            | Meaning                  | Fix                                         |
| ---------------- | ------------------------ | ------------------------------------------- |
| `invalid_client` | Wrong client ID/secret   | Check AUTH_CLIENT_ID and AUTH_CLIENT_SECRET |
| `invalid_grant`  | Token expired or invalid | Re-authenticate                             |
| `access_denied`  | User denied consent      | Check RBAC permissions                      |

### API Errors

| Status | Meaning       | Common Cause             |
| ------ | ------------- | ------------------------ |
| 400    | Bad Request   | Invalid request body     |
| 401    | Unauthorized  | Missing/expired token    |
| 403    | Forbidden     | Insufficient permissions |
| 404    | Not Found     | Resource doesn't exist   |
| 409    | Conflict      | Duplicate resource       |
| 422    | Unprocessable | Validation failed        |
| 500    | Server Error  | Backend issue            |

### React Router Errors

| Error                     | Meaning          | Fix                   |
| ------------------------- | ---------------- | --------------------- |
| `ErrorBoundary` triggered | Render error     | Check component props |
| `loader threw`            | Loader exception | Add error handling    |
| `action threw`            | Action exception | Check mutation logic  |

---

## Performance Issues

### Slow Initial Load

**Diagnostics:**

1. Check network tab for large bundles
2. Review React Query prefetching
3. Check for blocking requests

**Solutions:**

- Enable code splitting
- Defer non-critical data
- Use skeleton loaders

---

### Memory Leaks

**Symptoms:**

- Increasing memory usage
- Browser becomes sluggish
- Tab crashes

**Diagnostics:**

1. Open DevTools → Memory
2. Take heap snapshot
3. Compare snapshots over time

**Common Causes:**

- Unclosed SSE connections
- Event listeners not cleaned up
- Large data in React Query cache

---

### Slow Queries

**Diagnostics:**

1. Check React Query DevTools
2. Look for redundant fetches
3. Review query key structure

**Solutions:**

- Add proper `staleTime`
- Use query deduplication
- Implement pagination

---

## Getting Help

### Collect Debug Information

When reporting issues, include:

1. **Environment:**

   ```bash
   node --version
   bun --version
   git rev-parse HEAD
   ```

2. **Error logs:**
   - Browser console output
   - Server terminal output
   - Network request/response

3. **Steps to reproduce:**
   - Exact actions taken
   - Expected vs actual behavior

### Resources

- [Architecture Docs](../architecture/overview.md)
- [GitHub Issues](https://github.com/datum-cloud/cloud-portal/issues)
- [Observability](./observability.md) for tracing issues

---

## Related Documentation

- [Local Development](../getting-started/03-running-locally.md)
- [Observability](./observability.md)
- [Testing](../development/testing.md)
