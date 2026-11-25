import { describeRegistrationStatus, registrationCheckedAt } from './registration-status';
import { describe, expect, it } from 'vitest';

describe('describeRegistrationStatus', () => {
  it('maps EPP and RDAP forms of the same code to one label', () => {
    for (const code of ['clientTransferProhibited', 'client transfer prohibited']) {
      const result = describeRegistrationStatus(code);
      expect(result.label).toBe('Transfer locked (registrar)');
      expect(result.tone).toBe('neutral');
      expect(result.code).toBe(code);
    }
  });

  it('uses the warning tone for hold and pending delete', () => {
    expect(describeRegistrationStatus('serverHold')).toEqual({
      code: 'serverHold',
      label: 'On hold: not in DNS',
      tone: 'warning',
    });
    expect(describeRegistrationStatus('pendingDelete')).toMatchObject({
      label: 'Pending deletion',
      tone: 'warning',
    });
    expect(describeRegistrationStatus('redemptionPeriod').tone).toBe('warning');
  });

  it('labels ok and active as Active', () => {
    expect(describeRegistrationStatus('ok').label).toBe('Active');
    expect(describeRegistrationStatus('active').label).toBe('Active');
  });

  it('maps both codes of a paired row to the same label', () => {
    expect(describeRegistrationStatus('server update prohibited').label).toBe('Changes locked');
    expect(describeRegistrationStatus('clientDeleteProhibited').label).toBe('Deletion locked');
    expect(describeRegistrationStatus('clientHold').label).toBe('On hold: not in DNS');
    expect(describeRegistrationStatus('renewPeriod').label).toBe('Recently renewed');
    expect(describeRegistrationStatus('inactive').label).toBe('Inactive');
  });

  it('labels renewal locks, pending transfers and grace periods', () => {
    expect(describeRegistrationStatus('clientRenewProhibited').label).toBe('Renewal locked');
    expect(describeRegistrationStatus('server renew prohibited').label).toBe('Renewal locked');
    expect(describeRegistrationStatus('pendingTransfer')).toMatchObject({
      label: 'Transfer pending',
      tone: 'neutral',
    });
    expect(describeRegistrationStatus('add period').label).toBe('Recently registered');
    expect(describeRegistrationStatus('transferPeriod').label).toBe('Recently transferred');
  });

  it('shows unknown codes as received with a neutral tone', () => {
    expect(describeRegistrationStatus('someNewCode')).toEqual({
      code: 'someNewCode',
      label: 'someNewCode',
      tone: 'neutral',
    });
  });
});

describe('registrationCheckedAt', () => {
  it('returns the last lookup time when it is a date', () => {
    expect(registrationCheckedAt({ lastRefreshAttempt: '2026-11-25T03:00:00Z' })).toBe(
      '2026-11-25T03:00:00Z'
    );
  });

  it('returns undefined when the time is missing or not a date', () => {
    expect(registrationCheckedAt(undefined)).toBeUndefined();
    expect(registrationCheckedAt(null)).toBeUndefined();
    expect(registrationCheckedAt({})).toBeUndefined();
    expect(registrationCheckedAt({ lastRefreshAttempt: '' })).toBeUndefined();
    expect(registrationCheckedAt({ lastRefreshAttempt: 'not a date' })).toBeUndefined();
  });
});
