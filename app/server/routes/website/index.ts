import type { FeedbackSink } from './feedback/feedback-sink';
import { createLogFeedbackSink } from './feedback/log-feedback-sink';
import { createFeedbackRoutes, type CounterLike } from './feedback/routes';
import { buildProfile } from './profile.builder';
import {
  buildSessionStatus,
  pickOrganization,
  type SessionStatus,
  type SessionStatusDeps,
} from './session-status.builder';
import { settle } from './settle';
import { createStatusCache, type StatusCache } from './status-cache';
import { logger } from '@/modules/logger';
import { redisClient } from '@/modules/redis';
import { createOrganizationService } from '@/resources/organizations';
import { createProjectService } from '@/resources/projects';
import { createUserService } from '@/resources/users';
import {
  trafficClassLimiter,
  type TrafficClassLimiterOptions,
} from '@/server/middleware/rate-limit';
import { websiteCorsMiddleware } from '@/server/middleware/website-cors';
import type { Variables } from '@/server/types';
import { getOrgSession } from '@/utils/cookies/org.server';
import { env } from '@/utils/env/env.server';
import { Hono, type MiddlewareHandler } from 'hono';

const STATUS_TTL_SECONDS = 60;
const MILO_TIMEOUT_MS = 2000;

export interface WebsiteRoutesOptions {
  origins?: string[];
  cache?: StatusCache<SessionStatus>;
  /** Pass null to disable rate limiting (tests). */
  rateLimiter?: MiddlewareHandler | null;
  /**
   * Overrides for the default limiter's budgets/redis, applied on top of the
   * group's `isBrowserOrigin` wiring. Tests use tiny budgets and `redis: null`
   * to exercise the real limiter without touching Redis.
   */
  rateLimiterOptions?: Pick<TrafficClassLimiterOptions, 'budgets' | 'redis'>;
  deps?: () => Omit<SessionStatusDeps, 'preferredOrg'>;
  readPreferredOrg?: (request: Request) => Promise<string | null>;
  profileDeps?: () => {
    getUserProfile(
      sub: string
    ): Promise<{ email?: string; givenName?: string; familyName?: string }>;
    secret?: string;
    /** Deadline for each Milo lookup; defaults to MILO_TIMEOUT_MS (tests shorten it). */
    timeoutMs?: number;
  };
  /** Defaults to a log-backed sink until enhancements#889 lands a durable one. */
  feedbackSink?: FeedbackSink;
  /** Per-user rate-limit counter for /feedback. Pass null to use in-memory counting (tests). */
  feedbackCounter?: CounterLike | null;
}

function liveDeps(): Omit<SessionStatusDeps, 'preferredOrg'> {
  const users = createUserService();
  const orgs = createOrganizationService();
  const projects = createProjectService();
  return {
    getUser: (sub) => users.get(sub),
    listOrganizations: async () =>
      (await orgs.list()).items.map((o) => ({
        name: o.name,
        displayName: o.displayName || o.name,
      })),
    hasProjects: async (orgName) => (await projects.list(orgName, { limit: 1 })).items.length > 0,
    appUrl: env.public.appUrl.replace(/\/+$/, ''),
    timeoutMs: MILO_TIMEOUT_MS,
  };
}

async function livePreferredOrg(request: Request): Promise<string | null> {
  const { orgId } = await getOrgSession(request);
  return orgId ?? null;
}

function liveProfileDeps() {
  const users = createUserService();
  return {
    getUserProfile: async (sub: string) => {
      const u = await users.get(sub);
      return { email: u.email, givenName: u.givenName, familyName: u.familyName };
    },
    secret: env.server.websiteHelpscoutSecretKey,
    timeoutMs: MILO_TIMEOUT_MS,
  };
}

/**
 * Routes datum.net calls with `credentials: 'include'`. Mounted ahead of the
 * guarded /api sub-app because session-status must answer anonymous visitors
 * with `{ signedIn: false }` rather than 401.
 */
export function createWebsiteRoutes(options: WebsiteRoutesOptions = {}) {
  const origins = options.origins ?? env.server.websiteOrigins;
  const allowedOrigins = new Set(origins);
  const cache = options.cache ?? createStatusCache<SessionStatus>(redisClient);
  const deps = options.deps ?? liveDeps;
  const readPreferredOrg = options.readPreferredOrg ?? livePreferredOrg;
  const profileDeps = options.profileDeps ?? liveProfileDeps;
  const feedbackSink =
    options.feedbackSink ??
    createLogFeedbackSink((message, fields) => logger.info(message, fields));
  const feedbackCounter =
    options.feedbackCounter === undefined ? redisClient : options.feedbackCounter;
  const rateLimiter =
    options.rateLimiter === undefined
      ? trafficClassLimiter({
          enforceBrowserOrigin: false,
          // The CORS middleware below already rejected anything whose Origin
          // isn't in `allowedOrigins`, so by the time this runs the request
          // is legitimate website traffic even though `Sec-Fetch-Site` reads
          // `same-site` rather than `same-origin`.
          isBrowserOrigin: (c) => allowedOrigins.has(c.req.header('Origin') ?? ''),
          ...options.rateLimiterOptions,
        })
      : options.rateLimiter;

  const website = new Hono<{ Variables: Variables }>();

  website.use('*', websiteCorsMiddleware({ origins }));
  if (rateLimiter) website.use('*', rateLimiter);

  website.get('/session-status', async (c) => {
    const session = c.get('session');
    if (!session) return c.json({ signedIn: false } satisfies SessionStatus);

    // The payload embeds `org` and an org-scoped `dashboardUrl`, so the org
    // belongs in the key. Keyed on `sub` alone, switching orgs would keep
    // serving — and linking to — the previous one until the TTL expired.
    // Reading it is a local cookie decrypt, not an upstream call.
    const preferredOrg = await readPreferredOrg(c.req.raw);
    const cacheKey = `${session.sub}:${preferredOrg ?? ''}`;

    const cached = await cache.get(cacheKey);
    if (cached) return c.json(cached);

    const status = await buildSessionStatus(session.sub, { ...deps(), preferredOrg });
    await cache.set(cacheKey, status, STATUS_TTL_SECONDS);
    return c.json(status);
  });

  // Always computed fresh: unlike /session-status this is never read from
  // `cache`, since HelpScout signatures and org membership must reflect the
  // live state at request time, not a 60s-stale snapshot.
  website.get('/profile', async (c) => {
    const session = c.get('session');
    if (!session) return c.json({ error: 'unauthenticated' }, 401);

    const { getUserProfile, secret, timeoutMs = MILO_TIMEOUT_MS } = profileDeps();
    const { listOrganizations } = deps();
    const [user, memberships, preferredOrg] = await Promise.all([
      settle(getUserProfile(session.sub), timeoutMs),
      settle(listOrganizations(), timeoutMs),
      readPreferredOrg(c.req.raw),
    ]);
    // The user record carries the email the HelpScout signature is built
    // from, so without it there is no profile to answer with. Orgs are
    // enrichment: a failure just omits `org`.
    if (!user) return c.json({ error: 'upstream_unavailable' }, 502);
    const org = pickOrganization(memberships ?? [], preferredOrg);

    return c.json(buildProfile({ user, org, secret }));
  });

  website.route('/feedback', createFeedbackRoutes(feedbackSink, origins, feedbackCounter));

  // `.notFound()` registers a handler private to this sub-app, which
  // `.route()` never copies into the parent router — only real routes are
  // copied. Registered last so it never shadows `/session-status`.
  website.all('*', (c) => c.json({ error: 'not_found' }, 404));

  return website;
}
