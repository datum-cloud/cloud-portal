import { requireBillingForAnyOrg, requireBillingForOrg } from './billing-gate.server';
import { FeatureFlag } from './flags';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

const isFeatureEnabled = mock(async () => false);

mock.module('./evaluate.server', () => ({
  isFeatureEnabled,
}));

describe('requireBillingForOrg', () => {
  beforeEach(() => {
    isFeatureEnabled.mockReset();
    isFeatureEnabled.mockImplementation(async () => false);
  });

  it('redirects to account root when orgId is missing', async () => {
    await expect(requireBillingForOrg(undefined)).rejects.toMatchObject({
      status: 302,
      headers: expect.objectContaining({
        get: expect.any(Function),
      }),
    });
  });

  it('redirects to org overview when billing is disabled', async () => {
    await expect(requireBillingForOrg('org-acme')).rejects.toMatchObject({
      status: 302,
    });
    expect(isFeatureEnabled).toHaveBeenCalledWith(FeatureFlag.Billing, 'org-acme');
  });

  it('allows access when billing is enabled for the org', async () => {
    isFeatureEnabled.mockImplementation(async () => true);
    await expect(requireBillingForOrg('org-acme')).resolves.toBeUndefined();
  });
});

describe('requireBillingForAnyOrg', () => {
  beforeEach(() => {
    isFeatureEnabled.mockReset();
    isFeatureEnabled.mockImplementation(async () => false);
  });

  it('redirects to account root when the user has no orgs', async () => {
    await expect(requireBillingForAnyOrg([])).rejects.toMatchObject({
      status: 302,
    });
  });

  it('redirects to account root when billing is disabled for every org', async () => {
    await expect(requireBillingForAnyOrg(['org-a', 'org-b'])).rejects.toMatchObject({
      status: 302,
    });
    expect(isFeatureEnabled).toHaveBeenCalledTimes(2);
  });

  it('allows access when billing is enabled for any org', async () => {
    isFeatureEnabled.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(requireBillingForAnyOrg(['org-a', 'org-b'])).resolves.toBeUndefined();
  });
});
