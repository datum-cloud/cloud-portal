import type { FeatureFlagKey, FeatureFlagMap } from './flags';
import './setup.server';
import { OpenFeature } from '@openfeature/server-sdk';

/**
 * Evaluate a boolean feature flag for the given organization.
 * Returns `defaultValue` if the flag is off, missing, errors, or no orgId.
 */
export async function isFeatureEnabled(
  flag: FeatureFlagKey,
  orgId: string | undefined,
  defaultValue = false
): Promise<boolean> {
  if (!orgId) return defaultValue;
  const client = OpenFeature.getClient();
  return client.getBooleanValue(flag, defaultValue, { targetingKey: orgId });
}

/**
 * Evaluate a set of feature flags against every org the user belongs to
 * and return a map of flag → true-if-any-org-has-it. Used by the
 * private-layout loader to populate the AppProvider's `featureFlags`
 * context so global components (header, dropdown) can read flags
 * without their own per-request eval calls.
 *
 * Each (flag, orgId) eval is wrapped in a `.catch(() => false)` so a
 * single broken evaluator never blocks the layout. The cost scales
 * linearly with `flags.length * orgIds.length`; keep `ROOT_FEATURE_FLAGS`
 * short.
 */
export async function evaluateFlagsForOrgs(
  flags: readonly FeatureFlagKey[],
  orgIds: string[]
): Promise<FeatureFlagMap> {
  if (flags.length === 0 || orgIds.length === 0) return {};
  const entries = await Promise.all(
    flags.map(async (flag): Promise<readonly [FeatureFlagKey, boolean]> => {
      const results = await Promise.all(
        orgIds.map((orgId) => isFeatureEnabled(flag, orgId).catch(() => false))
      );
      return [flag, results.some(Boolean)];
    })
  );
  return Object.fromEntries(entries) as FeatureFlagMap;
}
