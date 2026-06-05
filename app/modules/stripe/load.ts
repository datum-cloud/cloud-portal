import { loadStripe, type Stripe } from '@stripe/stripe-js';

/**
 * Memoised Stripe.js loader keyed by publishable key.
 *
 * The Stripe React provider expects a stable `Promise<Stripe | null>` so it
 * can pass the resulting Stripe instance into every `<Elements>` mount it
 * sees. Recreating the promise on every render would re-download Stripe.js
 * and remount every Element, so we cache it module-side.
 *
 * Keyed by `publishableKey` because the same portal instance may serve
 * multiple tenants whose `StripeProviderConfig` resources resolve to
 * different Stripe accounts — switching org should pick up a fresh key
 * without bleeding state from the previous one.
 */
const cache = new Map<string, Promise<Stripe | null>>();

/**
 * Returns a memoised `Promise<Stripe | null>` for the given publishable key,
 * or `null` if no key is provided. Pass the result straight to
 * `<Elements stripe={...} />`.
 *
 * Safe to call from the server: `loadStripe` only touches `window` lazily
 * (when the returned promise is awaited), so SSR just hands a pending
 * promise to React which resolves on the client.
 */
export const getStripe = (publishableKey: string | undefined): Promise<Stripe | null> | null => {
  if (!publishableKey) return null;
  let promise = cache.get(publishableKey);
  if (!promise) {
    promise = loadStripe(publishableKey);
    cache.set(publishableKey, promise);
  }
  return promise;
};
