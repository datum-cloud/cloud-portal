/**
 * Loads Stripe.js on every page once the browser is idle.
 *
 * Stripe's fraud detection (Radar) works best when Stripe.js sees the whole
 * session, not just billing pages, so it can't wait for a payment form. It
 * also shouldn't compete with the portal's own JS and CSS on first load.
 * Importing the package's main entry injects the script; a payment form that
 * calls `loadStripe` later reuses that script tag instead of adding another.
 */
export function preloadStripeWhenIdle(): () => void {
  const load = () => {
    import('@stripe/stripe-js').catch(() => {
      // Fraud signals are best-effort; payment forms load Stripe.js themselves.
    });
  };

  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(load, { timeout: 5000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(load, 2000);
  return () => clearTimeout(id);
}
