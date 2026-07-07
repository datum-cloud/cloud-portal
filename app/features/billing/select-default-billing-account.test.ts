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

  it('skips accounts pending deletion even when they still report Ready', () => {
    const accounts = [
      {
        metadata: { name: 'terminating', deletionTimestamp: '2026-07-02T15:27:25Z' },
        status: { phase: 'Ready' },
      },
      { metadata: { name: 'healthy' }, status: { phase: 'Ready' } },
    ] as never;

    expect(selectDefaultOrgBillingAccount(accounts)?.metadata?.name).toBe('healthy');
  });

  it('returns undefined when every account is terminating', () => {
    const accounts = [
      {
        metadata: { name: 'terminating', deletionTimestamp: '2026-07-02T15:27:25Z' },
        status: { phase: 'Ready' },
      },
    ] as never;

    expect(selectDefaultOrgBillingAccount(accounts)).toBeUndefined();
  });
});
