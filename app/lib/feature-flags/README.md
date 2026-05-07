# Feature flags

OpenFeature server provider backed by Milo `AllowanceBucket`s.

A feature flag is an `AllowanceBucket` with `spec.type=Feature`. The flag is
**enabled** for an organization when the bucket has `status.available > 0`.

## Flag keys

The OpenFeature flag key is the **full** `spec.resourceType` of the registered
flag, e.g.

```
billing.miloapis.com/cloud-portal-usage-metering-dashboard
```

There is no implicit prefix. Use the same string the registration uses.

## Setup (loader-side)

```ts
import { MiloFeatureFlagProvider } from '@/lib/feature-flags';
import { createAllowanceBucketService } from '@/resources/allowance-buckets';
import { OpenFeature } from '@openfeature/server-sdk';

OpenFeature.setProvider(
  new MiloFeatureFlagProvider({
    bucketService: createAllowanceBucketService(),
  })
);
```

Do this once at app boot. The provider caches the per-org bucket list for 5 s,
so a single page render that checks several flags performs at most one LIST.

## Usage in a route loader

```ts
import { OpenFeature } from '@openfeature/server-sdk';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const client = OpenFeature.getClient();
  const usageMeteringEnabled = await client.getBooleanValue(
    'billing.miloapis.com/cloud-portal-usage-metering-dashboard',
    false,
    { targetingKey: params.orgId! }
  );
  return { usageMeteringEnabled };
};
```

## Failure mode

The provider never throws on resolution. On API error, missing bucket, or
missing `targetingKey`, it returns the caller's `defaultValue`. Closed-by-default
gating is the responsibility of each call site.

## Tests

```sh
bun run test:lib
```
