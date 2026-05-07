import { MiloFeatureFlagProvider } from './milo-provider';
import { createAllowanceBucketService } from '@/resources/allowance-buckets';
import { OpenFeature } from '@openfeature/server-sdk';

let registered = false;

/**
 * Registers MiloFeatureFlagProvider with OpenFeature on first call.
 * Safe to import for side effects from the server entry.
 */
export function ensureFeatureFlagProvider(): void {
  if (registered) return;
  OpenFeature.setProvider(
    new MiloFeatureFlagProvider({
      bucketService: createAllowanceBucketService(),
    })
  );
  registered = true;
}

ensureFeatureFlagProvider();
