/**
 * Feature flag keys. These are the full `spec.resourceType` of the Milo
 * ResourceRegistration that backs each flag — no implicit prefix.
 */
export const FeatureFlag = {
  UsageMeteringDashboard: 'billing.miloapis.com/cloud-portal-usage-metering-dashboard',
  MultiBillingAccounts: 'billing.miloapis.com/multi-billing-accounts',
  Billing: 'billing.miloapis.com/cloud-portal-billing',
} as const;

export type FeatureFlagKey = (typeof FeatureFlag)[keyof typeof FeatureFlag];

/**
 * Flags resolved once at the private-layout loader and surfaced on the
 * AppProvider context. The `useFeatureFlag` hook reads from this map so
 * any global component (header, dropdown, page chrome) can gate on a
 * flag without threading new props through every intervening layout.
 *
 * Append-only: add a flag here and it lights up for every consumer of
 * `useFeatureFlag`. The cost is one eval per flag per request against
 * the user's orgs, so keep this short and reserved for genuinely
 * cross-cutting flags. Per-page flags should stay in their layout
 * loader's `companions` block as before.
 */
export const ROOT_FEATURE_FLAGS: readonly FeatureFlagKey[] = [FeatureFlag.Billing] as const;

/** Map of FeatureFlagKey → resolved boolean, served through AppContext. */
export type FeatureFlagMap = Partial<Record<FeatureFlagKey, boolean>>;
