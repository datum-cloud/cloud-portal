import { selectDefaultOrgBillingAccount } from './types';
import { describe, expect, it } from 'bun:test';

describe('selectDefaultOrgBillingAccount', () => {
  it('prefers Ready accounts', () => {
    const accounts = [
      { metadata: { name: 'pending' }, status: { phase: 'Provisioning' } },
      { metadata: { name: 'ready' }, status: { phase: 'Ready' } },
    ] as never;

    expect(selectDefaultOrgBillingAccount(accounts)?.metadata?.name).toBe('ready');
  });

  it('falls back to the first account when none are Ready', () => {
    const accounts = [{ metadata: { name: 'only' }, status: { phase: 'Provisioning' } }] as never;

    expect(selectDefaultOrgBillingAccount(accounts)?.metadata?.name).toBe('only');
  });

  it('returns undefined when the org has no billing accounts', () => {
    expect(selectDefaultOrgBillingAccount([])).toBeUndefined();
  });
});
