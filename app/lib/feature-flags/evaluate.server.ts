import type { FeatureFlagKey } from './flags';
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
