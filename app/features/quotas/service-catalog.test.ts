import { resolveServiceDisplayName, OTHER_GROUP } from './service-catalog';
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

  it('returns the Other group when nothing matches', () => {
    expect(resolveServiceDisplayName(undefined, 'unknown.example.com/widgets')).toBe(OTHER_GROUP);
  });
});
