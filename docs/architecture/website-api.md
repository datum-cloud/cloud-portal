# Website API

The portal serves a small route group under `/api/website/*` for the datum.net marketing site. The site uses it to show whether a visitor is signed in, to sign visitors in and out without leaving datum.net, to open HelpScout chats as a known user, and to send feedback.

The design spec lives in the datum.net repo on the `docs/website-personalization-spec` branch, which the website team owns. The work is tracked in [enhancements#890](https://github.com/datum-cloud/enhancements/issues/890) and [enhancements#893](https://github.com/datum-cloud/enhancements/issues/893), and it shipped in [cloud-portal#1581](https://github.com/datum-cloud/cloud-portal/pull/1581).

## Why it works at all

The portal session cookie is scoped to cloud.datum.net. www.datum.net and cloud.datum.net are the same site, so the browser attaches that cookie to any `fetch(..., { credentials: 'include' })` the website makes to the portal. The portal reads the session the same way it does for its own pages.

That also means any page on any `*.datum.net` subdomain could send those requests with the user's cookie. The exact-origin CORS check in `app/server/middleware/website-cors.ts` is what keeps other subdomains from reading the answers.

## Endpoints

| Path                                  | How datum.net calls it            | Session        | Protection                                         |
| ------------------------------------- | --------------------------------- | -------------- | -------------------------------------------------- |
| `GET /api/website/session-status`     | `fetch` with credentials          | optional       | CORS allowlist, traffic-class limiter              |
| `GET /api/website/profile`            | `fetch` with credentials          | required (401) | CORS allowlist, traffic-class limiter              |
| `POST /api/website/feedback`          | `fetch` with `X-Datum-Website: 1` | required (401) | as above, plus a 16 KB body limit and 5 per 10 min |
| `GET /api/website/login?returnTo=URL` | `<a href>` navigation             | none           | own limiter, 30 per minute                         |
| `GET /api/website/logout`             | `<a href>` navigation             | none           | own limiter, 30 per minute                         |

The code is in `app/server/routes/website/`.

## Mounting order

`app/server/entry.ts` mounts the routes in this order:

```ts
app.route('/api/website/login', createWebsiteLoginRoute());
app.route('/api/website/logout', createWebsiteLogoutRoute());
app.route('/api/website', createWebsiteRoutes());
app.route('/api', createApiApp()); // guarded
```

The website group sits ahead of the guarded `/api` app because `/session-status` has to answer anonymous visitors with `{ signedIn: false }`. Behind the auth guard they would get a 401.

`/login` and `/logout` are mounted on their own, before the group. They are top-level navigations, and browsers send no `Origin` header on those, so the group's CORS check would reject every one of them.

Before any of these run, the global `sessionMiddleware()` decrypts the session cookie and sets `c.get('session')` when it is valid. The website routes never read auth cookies themselves.

The group ends with `website.all('*')` returning a JSON 404. Hono's `.route()` copies routes into the parent app but leaves a sub-app's `.notFound()` behind, so without the catch-all an unknown `/api/website/*` path would fall through to the guarded API or the React Router app.

## CORS and CSRF

`websiteCorsMiddleware` applies to the whole group:

1. A request whose `Origin` is missing or not an exact match for an entry in `WEBSITE_ORIGINS` gets a 403 `origin_not_allowed`. There are no wildcards.
2. Allowed requests get `Access-Control-Allow-Origin: <origin>`, `Access-Control-Allow-Credentials: true`, `Vary: Origin` and `Cache-Control: no-store`.
3. `OPTIONS` preflights allow `GET, POST, OPTIONS` and the headers `Content-Type, X-Datum-Website`, cached for 600 seconds.
4. Writes (`POST`, `PUT`, `PATCH`, `DELETE`) must carry `X-Datum-Website: 1`, or they get a 403 `missing_website_header`.

A plain HTML form can't set a custom header, and setting one from `fetch` forces a preflight. Every state change therefore has to pass the origin check before the browser sends it.

The group's `trafficClassLimiter` treats allowlisted origins as browser traffic. Those requests arrive with `Sec-Fetch-Site: same-site`, which the limiter would otherwise count as scripted. Anonymous website traffic has no session to key on, so the limiter keys it by client IP. If `X-Forwarded-For` doesn't reach the pod, every visitor lands in one shared bucket.

## Session status

`GET /api/website/session-status` returns display data only:

```ts
type SessionStatus =
  | { signedIn: false }
  | {
      signedIn: true;
      user: { id: string; displayName: string; email?: string; avatarUrl?: string };
      org?: { name: string; displayName: string; hasProjects?: boolean; selected: boolean };
      project?: { name: string; displayName: string };
      dashboardUrl: string;
      state?: 'new' | 'active';
    };
```

The handler in `index.ts` works like this:

```
no session                         -> { signedIn: false }
preferredOrg     = `_org` cookie (local decrypt, no upstream call)
preferredProject = `_project` cookie (local decrypt, no upstream call)
cache key        = website:status:<sub>:<preferredOrg>:<preferredProject>
cache hit                          -> cached payload
cache miss                         -> buildSessionStatus(), store for 60s
```

`buildSessionStatus` in `session-status.builder.ts` fetches the user, their organizations and the project named in the `_project` cookie in parallel, each with a 2 second deadline. The project lookup needs only the cookie value, so it adds nothing to the deadline. The builder picks the org from the `_org` cookie, falling back to the first membership.

`org.selected` says whether that pick can be trusted. It is `true` when the org came from the `_org` cookie, when it is the user's only org, or when a valid project confirms it. It is `false` when the builder fell back to the first membership, which happens once the 1-day `_org` cookie expires or when it names an org the user has left. A fallback org is fine for a navbar label, but a docs command filled with it would run against an org the user may not work in, so the docs fill `your-org-id` only when `selected` is `true`.

`pickProject` then decides whether the cookie's project can go in the payload. It must belong to the selected org and must not be marked for deletion. A failed lookup (including a 403 after the user lost access), a timeout, an org mismatch or an empty owner all leave `project` out. There is no fallback to the org's first project, because a wrong project name in a command the user pastes does more harm than a placeholder.

When the project passes, the builder returns it with `hasProjects: true` and skips the `hasProjects` lookup, since the project already proves the org has one. Otherwise it asks whether the org has any projects, using the time left on the shared deadline.

| Outcome                         | `project` | `state`  | `dashboardUrl`                      | `org.hasProjects` |
| ------------------------------- | --------- | -------- | ----------------------------------- | ----------------- |
| No organizations                | omitted   | `new`    | `/account/organizations`            | n/a               |
| Valid project in the org        | set       | `active` | `/project/<project>/home`           | `true`            |
| No valid project, lookup failed | omitted   | omitted  | `/org/<org>/projects`               | omitted           |
| No valid project, org has none  | omitted   | `new`    | `/org/<org>/projects?action=create` | `false`           |
| No valid project, org has some  | omitted   | `active` | `/org/<org>/projects`               | `true`            |

The last row is the most common signed-in answer. The portal sets `_project` (together with `_org`) when the user enters a project, in the action of `routes/project/detail/layout.tsx`, and `routes/org/detail/layout.tsx` clears it whenever an org-level page loads: the projects list, settings, billing, team and usage. A user who opens a project and then goes back to the org's project list has no project cookie, so callers should treat a missing `project` as normal.

The cookie alone decides `signedIn`. Every upstream lookup goes through `settle()`, which turns a rejection or timeout into `undefined`, so a Milo failure removes fields from the payload and leaves the user signed in. When the project lookup fails, `hasProjects` is left out on purpose: if it defaulted to `false`, a brief outage would make the website show a "create your first project" prompt to customers who already have projects.

Both cookies are part of the cache key. Keyed on the user alone, a user who switched orgs or projects would keep getting the previous one, and links to it, until the entry expired.

Logout needs no cache invalidation. The cache is read only after the session is confirmed valid, so once the cookie is gone the route answers `signedIn: false` before it looks.

The cache uses Redis when `REDIS_URL` is set and an in-memory map otherwise. A cache read or write error costs a recompute and nothing more.

## Profile

`GET /api/website/profile` returns the user's email and name, the selected org, and a HelpScout secure-mode signature (hex HMAC-SHA256 of the email, keyed with `HELPSCOUT_SECRET_KEY`). The website passes the signature to its own Beacon so chats open as the signed-in user.

It is computed on every request and never cached, since the signature and org membership have to match the user's current state. A failed user lookup returns 502 `upstream_unavailable` because the signature can't be built without the email. A failed org lookup leaves `org` out of the response.

`plan` is reserved in the type and stays empty until the billing source is decided (spec section 11).

## Feedback

`POST /api/website/feedback` takes `{ title, body, pageUrl }`. `feedback/routes.ts` validates it with zod: the title is 3 to 120 characters, the body 10 to 4000, and `pageUrl` must have an origin on the `WEBSITE_ORIGINS` list.

Each user gets 5 submissions per 10 minutes. The counter is an atomic Redis `INCR`. When a key turns up with no TTL, the route sets the expiry again so a lost `EXPIRE` can't leave the user blocked for good. If the counter errors, the request goes through.

Submissions go to a log-only sink for now. A durable store is tracked in [enhancements#889](https://github.com/datum-cloud/enhancements/issues/889).

## Sign in

The datum.net sign-in link points at `/api/website/login?returnTo=<page URL>`. `login.ts` handles it:

1. If `returnTo` is longer than 2048 characters, doesn't start with `http`, or fails `isValidRedirectTarget(returnTo, WEBSITE_ORIGINS)`, the route redirects to the portal home. The validator parses the URL, rejects embedded credentials, and requires an exact origin match.
2. A visitor who already has a session is redirected straight to `returnTo`.
3. Otherwise the route stores `returnTo` in the `_redirect_intent` cookie, starts the Zitadel OIDC flow itself, and adds the intent cookie to Zitadel's redirect response.
4. After login, `/auth/callback` calls `resolvePostLoginDestination` (`app/routes/auth/post-login-destination.ts`), which checks the stored intent against the same allowlist and sends the user back to datum.net.

The route starts OIDC itself because every portal page sits behind the private layout. That layout's guard writes its own path into `_redirect_intent` before it bounces an anonymous visitor to Zitadel, which would replace the website URL.

## Sign out

The datum.net sign-out link points at `/api/website/logout`. `logout.ts` does what the portal's own `/auth/logout` does, with a different landing page:

1. With no session, it redirects to the fallback right away.
2. Otherwise it revokes the tokens back-channel with `AuthService.logout`, clears every auth cookie, and sends the browser to Zitadel's `end_session` URL with `post_logout_redirect_uri` set to `WEBSITE_POST_LOGOUT_REDIRECT_URI`.
3. If there is no ID token, or anything throws, it clears the cookies and redirects to the fallback.

The fallback is `WEBSITE_POST_LOGOUT_REDIRECT_URI`, or the portal home when that is unset. It is never the portal login page, because someone who signed out on datum.net expects to stay there.

## Configuration

| Variable                           | Required           | Description                                                                                                                                                        |
| ---------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `WEBSITE_ORIGINS`                  | No                 | Comma-separated exact origins allowed to call `/api/website/*`, with no trailing slash. Production requires HTTPS origins. With none set, every origin is refused. |
| `WEBSITE_POST_LOGOUT_REDIRECT_URI` | No                 | Where `/api/website/logout` lands after Zitadel ends the session. Must be registered on the Zitadel OIDC client as a Post Logout URI, or Zitadel returns 400.      |
| `HELPSCOUT_SECRET_KEY`             | Yes, in production | Secure-mode secret shared by the portal Beacon and the datum.net Beacon. Without it `/profile` omits the signature.                                                |
| `REDIS_URL`                        | No                 | Backs the status cache, the feedback counter and the rate limiter. Each falls back to memory when unset.                                                           |

## Testing locally

Run the datum.net site on `http://localhost:4321` and set this in the portal's `.env`:

```env
WEBSITE_ORIGINS=http://localhost:4321
WEBSITE_POST_LOGOUT_REDIRECT_URI=http://localhost:4321
```

Check the origin gate with curl:

```bash
# 200, CORS headers, {"signedIn":false}
curl -i -H 'Origin: http://localhost:4321' http://localhost:3000/api/website/session-status

# 403 origin_not_allowed
curl -i http://localhost:3000/api/website/session-status
```

The builder's unit tests are in `app/server/routes/website/session-status.builder.test.ts`. The cache key is covered by `app/server/routes/website/index.test.ts`, and the limiter by `app/server/middleware/rate-limit.test.ts`.

## Rollout notes

Before enabling `WEBSITE_ORIGINS` in an environment, confirm that `X-Forwarded-For` reaches the pod (see [CORS and CSRF](#cors-and-csrf)). For the first hour, watch `api_nonbrowser_requests_total{route="website"}` and the rate-limit rejection count.

## Related documentation

- [Authentication](../development/authentication.md)
- [Environment setup](../getting-started/02-environment-setup.md)
- [Data Flow](./data-flow.md)
