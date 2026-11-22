import { API_GROUP_LABELS } from './api-group-labels';
import { describeApiError } from '@datum-cloud/datum-ui/error-content';
import { describe, expect, it } from 'vitest';

const HTTPROUTE_DENIAL =
  'httproutes.gateway.networking.k8s.io is forbidden: User "jane@example.com" cannot list resource "httproutes" in API group "gateway.networking.k8s.io" in the namespace "default"';

describe('API_GROUP_LABELS', () => {
  it('uses catalog wording', () => {
    expect(API_GROUP_LABELS['dns.networking.miloapis.com']).toBe('DNS');
    expect(API_GROUP_LABELS['networking.datumapis.com']).toBe('Networking');
  });

  it('labels bridged groups', () => {
    expect(API_GROUP_LABELS['gateway.networking.k8s.io']).toBe('Networking');
  });

  it('adds the overlay groups', () => {
    expect(API_GROUP_LABELS['iam.miloapis.com']).toBe('Access (IAM)');
    expect(API_GROUP_LABELS['quota.miloapis.com']).toBe('Quotas');
    expect(API_GROUP_LABELS['notification.miloapis.com']).toBe('Notifications');
    expect(API_GROUP_LABELS['services.miloapis.com']).toBe('Services');
    expect(API_GROUP_LABELS['telemetry.miloapis.com']).toBe('Telemetry');
    expect(API_GROUP_LABELS['stripe.billing.miloapis.com']).toBe('Billing');
  });

  it('names a bridged denial through describeApiError', () => {
    const description = describeApiError(
      { status: 403, originalMessage: HTTPROUTE_DENIAL },
      { apiGroupLabels: API_GROUP_LABELS }
    );
    expect(description.title).toBe('Permission denied to view Networking.');
  });
});
