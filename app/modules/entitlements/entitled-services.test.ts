import {
  entitlementServiceIds,
  isGatedService,
  isServiceVisible,
  unionActiveServiceIds,
} from './entitled-services';
import { describe, expect, test } from 'bun:test';

const active = (serviceName: string, ref?: string) => ({
  metadata: { name: `proj--${serviceName.replace(/\./g, '-')}` },
  spec: { serviceRef: { name: ref ?? serviceName } },
  status: { phase: 'Active', serviceName },
});
const pending = (serviceName: string) => ({
  ...active(serviceName),
  status: { phase: 'Pending', serviceName },
});

describe('entitlementServiceIds', () => {
  test('returns the canonical service name and a differing serviceRef', () => {
    expect(entitlementServiceIds(active('compute.datumapis.com', 'compute-datumapis-com'))).toEqual(
      ['compute.datumapis.com', 'compute-datumapis-com']
    );
  });

  test('does not repeat the ref when it equals the canonical name', () => {
    expect(entitlementServiceIds(active('compute.datumapis.com'))).toEqual([
      'compute.datumapis.com',
    ]);
  });
});

describe('unionActiveServiceIds', () => {
  test('unions Active ids across projects and ignores other phases', () => {
    const result = unionActiveServiceIds([
      {
        status: 'fulfilled',
        value: [active('networking.datumapis.com'), pending('compute.datumapis.com')],
      },
      { status: 'fulfilled', value: [active('assistant.miloapis.com')] },
    ]);
    expect(result).toEqual(new Set(['networking.datumapis.com', 'assistant.miloapis.com']));
  });

  test('keeps going when one project lookup fails', () => {
    const result = unionActiveServiceIds([
      { status: 'rejected', reason: new Error('403') },
      { status: 'fulfilled', value: [active('compute.datumapis.com')] },
    ]);
    expect(result).toEqual(new Set(['compute.datumapis.com']));
  });

  test('returns null when every lookup failed so callers fail open', () => {
    expect(unionActiveServiceIds([{ status: 'rejected', reason: new Error('boom') }])).toBeNull();
  });

  test('returns null when no project reported any Active entitlement', () => {
    expect(
      unionActiveServiceIds([{ status: 'fulfilled', value: [pending('compute.datumapis.com')] }])
    ).toBeNull();
  });

  test('returns null for an empty scope', () => {
    expect(unionActiveServiceIds([])).toBeNull();
  });
});

describe('isServiceVisible', () => {
  const entitled = new Set(['networking.datumapis.com']);

  test('hides a gated service the scope is not entitled to', () => {
    expect(isServiceVisible('compute.datumapis.com', entitled)).toBe(false);
  });

  test('shows a gated service the scope is entitled to', () => {
    expect(isServiceVisible('compute.datumapis.com', new Set(['compute.datumapis.com']))).toBe(
      true
    );
  });

  test('always shows services that are not gated', () => {
    expect(isServiceVisible('billing.miloapis.com', entitled)).toBe(true);
    expect(isServiceVisible(undefined, entitled)).toBe(true);
  });

  test('fails open when entitlements are unknown', () => {
    expect(isServiceVisible('compute.datumapis.com', null)).toBe(true);
  });
});

describe('isGatedService', () => {
  test('treats compute and interconnect as entitlement-gated', () => {
    expect(isGatedService('compute.datumapis.com')).toBe(true);
    expect(isGatedService('interconnect.datumapis.com')).toBe(true);
  });

  test('never gates platform services, the assistant, or a missing owner', () => {
    expect(isGatedService('billing.miloapis.com')).toBe(false);
    expect(isGatedService('networking.datumapis.com')).toBe(false);
    expect(isGatedService('assistant.miloapis.com')).toBe(false);
    expect(isGatedService(undefined)).toBe(false);
  });
});
