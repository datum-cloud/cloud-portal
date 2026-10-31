import { lookupUsageBillingAccount, type BillingAccountLookupDeps } from './usage.server';
import type { BillingAccount } from '@/features/billing/types';
import { logger } from '@/modules/logger';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { afterAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';

const ACCOUNT = {
  name: 'acme-billing',
  status: { phase: 'Ready' },
  spec: { paymentTerms: {} },
} as unknown as BillingAccount;

const BINDING = {
  spec: { projectRef: { name: 'web' }, billingAccountRef: { name: 'acme-billing' } },
  status: { phase: 'Active' },
};

type Request = () => Promise<unknown>;

function deps(
  overrides: { listBindings?: Request; getAccount?: Request; listAccounts?: Request } = {}
): BillingAccountLookupDeps {
  return {
    bindings: { list: (overrides.listBindings ?? (async () => [BINDING])) as never },
    accounts: {
      get: (overrides.getAccount ?? (async () => ACCOUNT)) as never,
      list: (overrides.listAccounts ?? (async () => [ACCOUNT])) as never,
    },
  };
}

const rejectWith =
  (error: unknown): Request =>
  async () => {
    throw error;
  };

const errorSpy = spyOn(logger, 'error').mockImplementation(() => {});

// Other files log through the same logger, so start each case from zero.
beforeEach(() => {
  errorSpy.mockClear();
});

afterAll(() => {
  errorSpy.mockRestore();
});

describe('lookupUsageBillingAccount', () => {
  it('returns the org account when the lookup succeeds', async () => {
    const result = await lookupUsageBillingAccount('acme', 'all', deps());

    expect(result).toEqual({ billingAccount: ACCOUNT, billingAccountError: false });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('returns the bound account for a project', async () => {
    const result = await lookupUsageBillingAccount('acme', 'web', deps());

    expect(result).toEqual({ billingAccount: ACCOUNT, billingAccountError: false });
  });

  it('treats a missing billing account as no account, not a failure', async () => {
    const result = await lookupUsageBillingAccount(
      'acme',
      'web',
      deps({ getAccount: rejectWith(new NotFoundError('BillingAccount', 'acme-billing')) })
    );

    expect(result).toEqual({ billingAccount: null, billingAccountError: false });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('treats a raw 404 from the bindings list as no account', async () => {
    const result = await lookupUsageBillingAccount(
      'acme',
      'web',
      deps({ listBindings: rejectWith(Object.assign(new Error('gone'), { status: 404 })) })
    );

    expect(result).toEqual({ billingAccount: null, billingAccountError: false });
  });

  it('flags and logs an upstream failure instead of hiding it', async () => {
    const upstream = new Error('connect ECONNREFUSED');
    const result = await lookupUsageBillingAccount(
      'acme',
      'all',
      deps({ listAccounts: rejectWith(upstream) })
    );

    expect(result).toEqual({ billingAccount: null, billingAccountError: true });
    expect(errorSpy).toHaveBeenCalledWith('billing account lookup failed', upstream, {
      orgId: 'acme',
      projectId: 'all',
    });
  });

  it('flags a permission error on the project binding lookup', async () => {
    const result = await lookupUsageBillingAccount(
      'acme',
      'web',
      deps({ listBindings: rejectWith(new AuthorizationError('forbidden')) })
    );

    expect(result).toEqual({ billingAccount: null, billingAccountError: true });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
