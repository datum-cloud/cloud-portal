import type { FeatureFlagKey } from './flags';
import { useApp } from '@/providers/app.provider';

/**
 * Read a server-resolved feature flag from the AppProvider context.
 *
 * Backed by the `featureFlags` map populated in the private-layout
 * loader for every flag in `ROOT_FEATURE_FLAGS`. Returns `false` when
 * the flag wasn't in that list, when eval failed, or when the user
 * isn't yet wrapped in `<AppProvider>`. Components that need a flag
 * not in `ROOT_FEATURE_FLAGS` should resolve it in their own route
 * loader rather than reading through this hook.
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const { featureFlags } = useApp();
  return featureFlags?.[flag] ?? false;
}
