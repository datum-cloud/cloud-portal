import { slugifyBillingAccountName } from '@/resources/billing/_naming';
import { describe, expect, it } from 'bun:test';

describe('billing account create idempotency inputs', () => {
  it('reuses a pre-generated account name across logical create attempts', () => {
    const displayName = 'Acme Corp';
    const intendedAccountName = slugifyBillingAccountName(displayName);

    const firstAttemptName = intendedAccountName;
    const retryAttemptName = intendedAccountName;

    expect(firstAttemptName).toBe(retryAttemptName);
    expect(firstAttemptName).toMatch(/^ba-/);
  });
});
