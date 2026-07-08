import {
  createStripeProviderConfigService,
  stripeProviderConfigKeys,
} from './stripe-provider-config.service';
import type { StripeProviderConfig } from '@/features/billing/types';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

function stripeConfigsFromPublishableKey(key: string): StripeProviderConfig[] {
  return [{ spec: { publishableKey: key } } as StripeProviderConfig];
}

/**
 * Query every `StripeProviderConfig` the user can see. Most callers
 * just want `stripePublishableKey` — `useStripePublishableKey`
 * derives that from this query directly.
 */
export function useStripeProviderConfigs(
  options?: Omit<UseQueryOptions<StripeProviderConfig[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: stripeProviderConfigKeys.list(),
    queryFn: () => createStripeProviderConfigService().list(),
    ...options,
  });
}

/**
 * Convenience: the publishable key for the tenant's Stripe account.
 * Returns the first config's key; falls back to `undefined` when
 * none are reachable (which makes the add-card dialog render the
 * "not ready yet" fallback).
 */
export function useStripePublishableKey(
  options?: Omit<UseQueryOptions<StripeProviderConfig[]>, 'queryKey' | 'queryFn'> & {
    /** Loader- or parent-provided key; seeds the cache and still refetches on mount. */
    initialPublishableKey?: string;
  }
) {
  const { initialPublishableKey, ...queryOptions } = options ?? {};
  const query = useStripeProviderConfigs({
    retry: 3,
    refetchOnMount: true,
    ...queryOptions,
    initialData: initialPublishableKey
      ? stripeConfigsFromPublishableKey(initialPublishableKey)
      : queryOptions.initialData,
  });
  const key = query.data?.[0]?.spec?.publishableKey ?? undefined;
  return { ...query, publishableKey: key };
}
