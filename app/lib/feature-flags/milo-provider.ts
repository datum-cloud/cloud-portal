import type { AllowanceBucket } from '@/resources/allowance-buckets';
import {
  ErrorCode,
  StandardResolutionReasons,
  TypeMismatchError,
  type EvaluationContext,
  type JsonValue,
  type Provider,
  type ProviderMetadata,
  type ResolutionDetails,
} from '@openfeature/server-sdk';

const DEFAULT_TTL_MS = 5_000;

/**
 * Subset of the AllowanceBucket service used by the provider. The flag key
 * passed to OpenFeature is the full bucket `spec.resourceType`
 * (e.g. `billing.miloapis.com/cloud-portal-usage-metering-dashboard`), so
 * the provider only needs to list buckets for the org.
 */
export interface OrgBucketLister {
  list(namespace: 'organization', orgId: string): Promise<AllowanceBucket[]>;
}

export interface MiloFeatureFlagProviderOptions {
  bucketService: OrgBucketLister;
  /** Per-org cache TTL. Defaults to 5_000 ms. */
  ttlMs?: number;
  /** Override the clock for tests. */
  now?: () => number;
}

interface CacheEntry {
  expiresAt: number;
  buckets: Map<string, AllowanceBucket>;
}

/**
 * OpenFeature server provider backed by Milo AllowanceBuckets.
 *
 * Flag keys are the full `spec.resourceType` of a feature-typed
 * ResourceRegistration (e.g. `billing.miloapis.com/cloud-portal-usage-metering-dashboard`).
 * A flag is enabled for an org when an AllowanceBucket exists for
 * (org, resourceType) with `status.available > 0`.
 */
export class MiloFeatureFlagProvider implements Provider {
  readonly metadata: ProviderMetadata = { name: 'milo-allowance-bucket' };
  readonly runsOn = 'server';

  private readonly cache = new Map<string, Promise<CacheEntry>>();
  private readonly bucketService: OrgBucketLister;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(opts: MiloFeatureFlagProviderOptions) {
    this.bucketService = opts.bucketService;
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    this.now = opts.now ?? Date.now;
  }

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext
  ): Promise<ResolutionDetails<boolean>> {
    const orgName = context.targetingKey;
    if (!orgName) {
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.DEFAULT,
        errorCode: ErrorCode.TARGETING_KEY_MISSING,
        errorMessage: 'targetingKey (organization name) is required',
      };
    }

    let entry: CacheEntry;
    try {
      entry = await this.getOrgEntry(orgName);
    } catch (err) {
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.GENERAL,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }

    const bucket = entry.buckets.get(flagKey);
    if (!bucket) {
      return { value: defaultValue, reason: StandardResolutionReasons.DEFAULT };
    }

    const enabled = isAvailable(bucket.status?.available);
    return {
      value: enabled,
      reason: StandardResolutionReasons.TARGETING_MATCH,
    };
  }

  resolveStringEvaluation(_flagKey: string): Promise<ResolutionDetails<string>> {
    return Promise.reject(new TypeMismatchError(BOOLEAN_ONLY_MESSAGE));
  }

  resolveNumberEvaluation(_flagKey: string): Promise<ResolutionDetails<number>> {
    return Promise.reject(new TypeMismatchError(BOOLEAN_ONLY_MESSAGE));
  }

  resolveObjectEvaluation<T extends JsonValue>(_flagKey: string): Promise<ResolutionDetails<T>> {
    return Promise.reject(new TypeMismatchError(BOOLEAN_ONLY_MESSAGE));
  }

  private getOrgEntry(orgName: string): Promise<CacheEntry> {
    const cached = this.cache.get(orgName);
    if (cached) {
      return cached.then((entry) => {
        if (entry.expiresAt > this.now()) return entry;
        this.cache.delete(orgName);
        return this.getOrgEntry(orgName);
      });
    }

    const pending = this.bucketService.list('organization', orgName).then(
      (buckets) => {
        const byType = new Map<string, AllowanceBucket>();
        for (const b of buckets) byType.set(b.resourceType, b);
        return { expiresAt: this.now() + this.ttlMs, buckets: byType };
      },
      (err) => {
        this.cache.delete(orgName);
        throw err;
      }
    );

    this.cache.set(orgName, pending);
    return pending;
  }
}

const BOOLEAN_ONLY_MESSAGE = 'milo feature flags are boolean entitlements; use getBooleanValue';

function isAvailable(available: unknown): boolean {
  if (available === undefined || available === null) return false;
  try {
    return BigInt(available as string | number | bigint) > 0n;
  } catch {
    return false;
  }
}
