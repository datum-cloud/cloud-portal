import { logger } from '@/modules/logger';
import { redisClient } from '@/modules/redis';
import { parseResourceFromUrl } from '@/modules/sentry';
import { Counter, Gauge, register } from 'prom-client';

/**
 * Product engagement metrics: what users do in the portal, not how the portal
 * performs. Labels never carry user, org, project or resource identifiers.
 * Distinct counts (active users/orgs/projects) are kept in Redis HyperLogLogs
 * and surfaced as gauges, so every pod reports the same cluster-wide value;
 * query them with `max()`, never `sum()`.
 */

/** Reuses a registered metric so HMR/test re-imports don't throw (#1614). */
function counter<L extends string>(name: string, help: string, labelNames: readonly L[]) {
  return (
    (register.getSingleMetric(name) as Counter<L> | undefined) ??
    new Counter<L>({ name, help, labelNames: [...labelNames] })
  );
}

// ---------------------------------------------------------------------------
// Store: distinct counts and once-only markers, Redis-backed with a memory
// fallback for local dev (no REDIS_URL) and tests.
// ---------------------------------------------------------------------------

export type ActiveKind = 'users' | 'orgs' | 'projects';

export const ACTIVE_KINDS = ['users', 'orgs', 'projects'] as const satisfies readonly ActiveKind[];

export const ACTIVE_WINDOWS = { '1d': 1, '7d': 7, '30d': 30 } as const;

/** Day keys outlive the widest window by a day so a 30d count never loses its oldest day. */
const ACTIVE_KEY_TTL_SEC = 31 * 24 * 60 * 60;

/** A user reaches each onboarding step once; a later revisit inside this window isn't recounted. */
const ONBOARDING_MARK_TTL_SEC = 90 * 24 * 60 * 60;

export interface EngagementStore {
  addActive(kind: ActiveKind, day: string, id: string): Promise<void>;
  /** Distinct ids across the given days, or null when the count is unavailable. */
  countActive(kind: ActiveKind, days: string[]): Promise<number | null>;
  /** True the first time `key` is marked within `ttlSec`. */
  markOnce(key: string, ttlSec: number): Promise<boolean>;
}

const activeKey = (kind: ActiveKind, day: string) => `engagement:active:${kind}:${day}`;

export function createMemoryEngagementStore(): EngagementStore {
  const active = new Map<string, Set<string>>();
  const marks = new Map<string, number>();

  return {
    async addActive(kind, day, id) {
      const key = activeKey(kind, day);
      const ids = active.get(key) ?? new Set<string>();
      ids.add(id);
      active.set(key, ids);
    },
    async countActive(kind, days) {
      const union = new Set<string>();
      for (const day of days) {
        active.get(activeKey(kind, day))?.forEach((id) => union.add(id));
      }
      return union.size;
    },
    async markOnce(key, ttlSec) {
      const now = Date.now();
      const until = marks.get(key);
      if (until && until > now) return false;
      marks.set(key, now + ttlSec * 1000);
      return true;
    },
  };
}

interface RedisLike {
  status: string;
  call(command: string, ...args: (string | number)[]): Promise<unknown>;
}

/**
 * Writes fall back to memory when Redis is down, so the once-only onboarding
 * markers keep working. Counts do not: a single pod's memory count presented
 * as the cluster-wide figure would be wrong, so it reports nothing instead.
 */
export function createRedisEngagementStore(
  redis: RedisLike,
  fallback: EngagementStore = createMemoryEngagementStore()
): EngagementStore {
  let warned = false;
  const onRedisError = (error: unknown) => {
    if (warned) return;
    warned = true;
    logger.warn('[engagement] Redis unavailable, engagement counts degraded', {
      error: error instanceof Error ? error.message : String(error),
    });
  };

  return {
    async addActive(kind, day, id) {
      if (redis.status !== 'ready') return;
      try {
        const key = activeKey(kind, day);
        await redis.call('PFADD', key, id);
        await redis.call('EXPIRE', key, ACTIVE_KEY_TTL_SEC);
        warned = false;
      } catch (error) {
        onRedisError(error);
      }
    },
    async countActive(kind, days) {
      if (redis.status !== 'ready') return null;
      try {
        // PFCOUNT over several keys returns the cardinality of their union.
        const keys = days.map((day) => activeKey(kind, day));
        return Number(await redis.call('PFCOUNT', ...keys));
      } catch (error) {
        onRedisError(error);
        return null;
      }
    },
    async markOnce(key, ttlSec) {
      if (redis.status !== 'ready') return fallback.markOnce(key, ttlSec);
      try {
        const reply = await redis.call('SET', `engagement:${key}`, '1', 'NX', 'EX', ttlSec);
        warned = false;
        return reply === 'OK';
      } catch (error) {
        onRedisError(error);
        return fallback.markOnce(key, ttlSec);
      }
    },
  };
}

let store: EngagementStore | null = null;

function getStore(): EngagementStore {
  store ??= redisClient ? createRedisEngagementStore(redisClient) : createMemoryEngagementStore();
  return store;
}

/** Test seam: swap the backing store. Pass null to restore the default. */
export function setEngagementStore(next: EngagementStore | null): void {
  store = next;
  seen.clear();
}

// ---------------------------------------------------------------------------
// 1. Active users / orgs / projects (DAU, WAU, MAU)
// ---------------------------------------------------------------------------

/** UTC calendar day, `YYYY-MM-DD`. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The `count` UTC days ending at `now`, newest first. */
export function trailingDays(now: Date, count: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < count; i++) {
    days.push(utcDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return days;
}

/**
 * Ids this pod already sent to the store today. Every authenticated request
 * passes through `recordActivity`, so without this each request would be a
 * Redis round trip. Bounded so a flood of distinct ids can't grow it forever.
 */
const seen = new Set<string>();
const SEEN_MAX = 100_000;
let seenDay = '';

function activeGauge(kind: ActiveKind) {
  const name = `portal_active_${kind}`;
  return (
    (register.getSingleMetric(name) as Gauge<'window'> | undefined) ??
    new Gauge({
      name,
      help: `Distinct ${kind} active in the portal over the trailing window (cluster-wide; aggregate with max)`,
      labelNames: ['window'] as const,
      async collect() {
        this.reset();
        const now = new Date();
        for (const [window, days] of Object.entries(ACTIVE_WINDOWS)) {
          const count = await getStore().countActive(kind, trailingDays(now, days));
          if (count !== null) this.set({ window }, count);
        }
      },
    })
  );
}

export const activeUsersGauge = activeGauge('users');
export const activeOrgsGauge = activeGauge('orgs');
export const activeProjectsGauge = activeGauge('projects');

/** Page routes (`/org/:orgId`, `/project/:projectId`) and control-plane proxy paths. */
const ORG_PATH = /^\/org\/([^/]+)|\/organizations\/([^/]+)\/control-plane\//;
const PROJECT_PATH = /^\/project\/([^/]+)|\/projects\/([^/]+)\/control-plane\//;

/** Strips React Router's `.data` suffix from single-fetch requests. */
function scopeId(match: RegExpMatchArray | null): string | undefined {
  const id = match?.[1] ?? match?.[2];
  return id?.replace(/\.data$/, '') || undefined;
}

/** The org and project a request path is scoped to, if any. */
export function extractActivityScope(path: string): { orgId?: string; projectId?: string } {
  return {
    orgId: scopeId(path.match(ORG_PATH)),
    projectId: scopeId(path.match(PROJECT_PATH)),
  };
}

/**
 * Records that a user (and the org/project the request is scoped to) was
 * active today. Fire-and-forget: never awaited on the request path.
 */
export function recordActivity(userId: string, path: string, now: Date = new Date()): void {
  try {
    const day = utcDay(now);
    if (day !== seenDay || seen.size >= SEEN_MAX) {
      seen.clear();
      seenDay = day;
    }

    const { orgId, projectId } = extractActivityScope(path);
    const entries: [ActiveKind, string | undefined][] = [
      ['users', userId],
      ['orgs', orgId],
      ['projects', projectId],
    ];

    for (const [kind, id] of entries) {
      if (!id) continue;
      const seenKey = `${kind}:${id}`;
      if (seen.has(seenKey)) continue;
      seen.add(seenKey);
      void getStore().addActive(kind, day, id);
    }
  } catch {
    // Metrics must never fail the request path.
  }
}

// ---------------------------------------------------------------------------
// 2. Resource mutations (feature adoption)
// ---------------------------------------------------------------------------

export type MutationAction = 'create' | 'update' | 'delete';
export type MutationOutcome = 'success' | 'rejected' | 'failed';

const MUTATION_ACTIONS: Record<string, MutationAction> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

export const resourceMutationsTotal = counter(
  'portal_resource_mutations_total',
  'Count of resource create/update/delete requests users made, by resource type and outcome',
  ['api_group', 'resource_type', 'action', 'outcome'] as const
);

/** `rejected`: the API refused it (4xx). `failed`: server error or no response. */
export function mutationOutcome(status: number | string): MutationOutcome {
  const code = Number(status);
  if (!Number.isFinite(code)) return 'failed';
  if (code < 400) return 'success';
  if (code < 500) return 'rejected';
  return 'failed';
}

export interface MutationSample {
  method?: string;
  url?: string;
  status: number | string;
}

/**
 * Labels for `portal_resource_mutations_total`, or null when the request is
 * not a user-initiated mutation: reads, dry runs, access/token reviews (POSTs
 * that ask a question rather than create anything) and non-K8s paths.
 */
export function extractMutationLabels({
  method,
  url,
  status,
}: MutationSample): Record<'api_group' | 'resource_type' | 'action' | 'outcome', string> | null {
  const action = method ? MUTATION_ACTIONS[method.toUpperCase()] : undefined;
  if (!action || !url) return null;
  if (/[?&]dryRun=/.test(url)) return null;

  const resource = parseResourceFromUrl(url);
  if (!resource) return null;
  if (resource.resourceType.endsWith('reviews')) return null;

  return {
    api_group: resource.apiGroup,
    resource_type: resource.resourceType,
    action,
    outcome: mutationOutcome(status),
  };
}

export function recordResourceMutation(sample: MutationSample): void {
  if (typeof window !== 'undefined') return;
  try {
    const labels = extractMutationLabels(sample);
    if (labels) resourceMutationsTotal.inc(labels);
  } catch {
    // Metrics must never fail the request path.
  }
}

// ---------------------------------------------------------------------------
// 3. Onboarding funnel
// ---------------------------------------------------------------------------

/** In flow order: each step's count over the previous one is that step's conversion. */
export const ONBOARDING_STEPS = ['profile', 'account', 'billing', 'provisioning'] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const onboardingStepReachedTotal = counter(
  'portal_onboarding_step_reached_total',
  'Count of users who reached each onboarding step, once per user per step',
  ['step'] as const
);

/**
 * Counts a user reaching an onboarding step. Call from the step's loader only
 * when it renders the step, not when it redirects past it. Reloads and
 * revisits are not recounted. Fire-and-forget.
 */
export function recordOnboardingStep(step: OnboardingStep, userId: string): void {
  void getStore()
    .markOnce(`onboarding:${step}:${userId}`, ONBOARDING_MARK_TTL_SEC)
    .then((first) => {
      if (first) onboardingStepReachedTotal.inc({ step });
    })
    .catch(() => {
      // Metrics must never fail the request path.
    });
}

let initialized = false;

/**
 * Registers the engagement metrics so they appear on /metrics. Called from
 * the server entry so `"sideEffects": false` tree-shaking can't drop the
 * gauges, which nothing else references (same convention as ensureRbacMetrics).
 */
export function ensureEngagementMetrics(): void {
  if (initialized) return;
  initialized = true;
  void [
    activeUsersGauge,
    activeOrgsGauge,
    activeProjectsGauge,
    resourceMutationsTotal,
    onboardingStepReachedTotal,
  ];
}
