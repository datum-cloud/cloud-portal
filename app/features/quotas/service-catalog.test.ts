import {
  resolveResourceDisplayName,
  resolveServiceDisplayName,
  OTHER_GROUP,
} from './service-catalog';
import { describe, expect, it } from 'bun:test';

describe('resolveServiceDisplayName', () => {
  it('uses the owner reference when present', () => {
    expect(resolveServiceDisplayName('networking.datumapis.com', 'anything/x')).toBe('Networking');
  });

  it('falls back to the resourceType bridge when owner is missing', () => {
    expect(resolveServiceDisplayName(undefined, 'gateway.envoyproxy.io/securitypolicies')).toBe(
      'Networking'
    );
  });

  it('maps milo core resourceTypes to Platform Core', () => {
    expect(resolveServiceDisplayName('core.miloapis.com', 'core.miloapis.com/configmaps')).toBe(
      'Platform Core'
    );
  });

  it('groups compute fan-out registrations under Compute via the owner label', () => {
    expect(
      resolveServiceDisplayName('compute.datumapis.com', 'compute.datumapis.com/instances')
    ).toBe('Compute');
  });

  it('returns the Other group when nothing matches', () => {
    expect(resolveServiceDisplayName(undefined, 'unknown.example.com/widgets')).toBe(OTHER_GROUP);
  });
});

describe('resolveResourceDisplayName', () => {
  it('prefers the server-authored display name', () => {
    expect(resolveResourceDisplayName('Compute Instances', 'compute.datumapis.com/instances')).toBe(
      'Compute Instances'
    );
  });

  it('falls back to the interim resourceType map when the annotation is missing', () => {
    expect(resolveResourceDisplayName(undefined, 'compute.datumapis.com/vcpus')).toBe('vCPUs');
  });

  it('returns the raw resourceType when nothing matches', () => {
    expect(resolveResourceDisplayName(undefined, 'unknown.example.com/widgets')).toBe(
      'unknown.example.com/widgets'
    );
  });
});
