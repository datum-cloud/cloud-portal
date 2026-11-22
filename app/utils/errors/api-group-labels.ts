import { catalogApiGroupDisplayNames } from '@/modules/service-catalog';

/**
 * Groups the service catalog does not name yet. Catalog names win, so an entry
 * here can be dropped once the catalog covers its group.
 */
const LABEL_OVERLAY: Readonly<Record<string, string>> = {
  'iam.miloapis.com': 'Access (IAM)',
  'quota.miloapis.com': 'Quotas',
  'notification.miloapis.com': 'Notifications',
  'services.miloapis.com': 'Services',
  'telemetry.miloapis.com': 'Telemetry',
  'stripe.billing.miloapis.com': 'Billing',
};

/**
 * Product-area names by Kubernetes API group, for datum-ui's
 * `describeApiError`: a permission denial on a listed group names the area
 * ("Permission denied to view DNS.") instead of the raw resource.
 */
export const API_GROUP_LABELS: Readonly<Record<string, string>> = {
  ...LABEL_OVERLAY,
  ...catalogApiGroupDisplayNames(),
};
