import {
  formatWafProtectionStateLabel,
  formatWafProtectionStatusTooltip,
  getWafProtectionState,
  isTrafficProtectionProgrammed,
  mergeTrafficProtectionView,
} from './http-proxy.waf-status';
import { describe, expect, it } from 'bun:test';

describe('isTrafficProtectionProgrammed', () => {
  it('returns false when ancestors are missing', () => {
    expect(isTrafficProtectionProgrammed(undefined)).toBe(false);
    expect(isTrafficProtectionProgrammed({ ancestors: [] })).toBe(false);
  });

  it('requires Programmed True on every Accepted ancestor', () => {
    expect(
      isTrafficProtectionProgrammed({
        ancestors: [
          {
            conditions: [
              { type: 'Accepted', status: 'True' },
              { type: 'Programmed', status: 'True' },
            ],
          },
        ],
      })
    ).toBe(true);

    expect(
      isTrafficProtectionProgrammed({
        ancestors: [
          {
            conditions: [
              { type: 'Accepted', status: 'True' },
              { type: 'Programmed', status: 'False', message: '1/2 edges programmed generation 3' },
            ],
          },
        ],
      })
    ).toBe(false);
  });

  it('ignores ancestors that are not Accepted', () => {
    expect(
      isTrafficProtectionProgrammed({
        ancestors: [
          {
            conditions: [
              { type: 'Accepted', status: 'True' },
              { type: 'Programmed', status: 'True' },
            ],
          },
          {
            conditions: [{ type: 'Accepted', status: 'False' }],
          },
        ],
      })
    ).toBe(true);
  });
});

describe('mergeTrafficProtectionView', () => {
  it('keeps Programmed when the incoming view omitted status', () => {
    expect(
      mergeTrafficProtectionView(
        {
          mode: 'Enforce',
          policyName: 'alb',
          programmed: true,
        },
        { mode: 'Enforce', policyName: 'alb' }
      )
    ).toEqual({
      mode: 'Enforce',
      policyName: 'alb',
      programmed: true,
    });
  });

  it('drops events for a different policy name', () => {
    const current = { policyName: 'alb-protection', programmed: true };
    expect(
      mergeTrafficProtectionView(current, {
        policyName: 'alb',
        programmed: false,
      })
    ).toEqual(current);
  });

  it('applies an explicit Programmed=false from the same policy', () => {
    expect(
      mergeTrafficProtectionView(
        { policyName: 'alb', programmed: true },
        { policyName: 'alb', programmed: false, programmedMessage: 'Waiting for edges' }
      )
    ).toEqual({
      policyName: 'alb',
      programmed: false,
      programmedMessage: 'Waiting for edges',
    });
  });
});

describe('getWafProtectionState', () => {
  it('maps mode and programmed into tenant labels', () => {
    expect(getWafProtectionState('Enforce', true)).toBe('protected');
    expect(getWafProtectionState('Observe', true)).toBe('monitoring');
    expect(getWafProtectionState('Enforce', false)).toBe('pending');
    expect(getWafProtectionState('Enforce', false, 'PartialFailure')).toBe('error');
    expect(getWafProtectionState('Disabled', true)).toBe('disabled');
  });
});

describe('formatWafProtectionStateLabel', () => {
  it('returns a short readiness label for tooltips', () => {
    expect(formatWafProtectionStateLabel('protected')).toBe('Protected');
    expect(formatWafProtectionStateLabel('monitoring')).toBe('Monitoring');
    expect(formatWafProtectionStateLabel('pending')).toBe('Pending');
    expect(formatWafProtectionStateLabel('error')).toBe('Error');
    expect(formatWafProtectionStateLabel('disabled')).toBe('Disabled');
  });
});

describe('formatWafProtectionStatusTooltip', () => {
  it('prefers the Programmed message while converging or failed', () => {
    expect(formatWafProtectionStatusTooltip('pending', '1/2 edges programmed generation 3')).toBe(
      '1/2 edges programmed generation 3'
    );
    expect(formatWafProtectionStatusTooltip('error', '1/2 edges programmed generation 3')).toBe(
      '1/2 edges programmed generation 3'
    );
    expect(formatWafProtectionStatusTooltip('protected')).toBe(
      'WAF is protecting traffic on all edges'
    );
  });
});
