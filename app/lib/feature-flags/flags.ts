/**
 * Feature flag keys. These are the full `spec.resourceType` of the Milo
 * ResourceRegistration that backs each flag — no implicit prefix.
 */
export const FeatureFlag = {
  UsageMeteringDashboard: 'billing.miloapis.com/cloud-portal-usage-metering-dashboard',
} as const;

export type FeatureFlagKey = (typeof FeatureFlag)[keyof typeof FeatureFlag];
