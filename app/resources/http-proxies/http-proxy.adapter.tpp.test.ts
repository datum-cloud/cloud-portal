import {
  getRuleExclusions,
  toTrafficProtectionPolicyPayload,
  toTrafficProtectionPolicySpecPatch,
} from './http-proxy.adapter';
import type { ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy } from '@/modules/control-plane/networking';
import { describe, expect, it } from 'bun:test';

function policy(
  overrides?: Partial<ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy>
): ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy {
  return {
    apiVersion: 'networking.datumapis.com/v1alpha',
    kind: 'TrafficProtectionPolicy',
    metadata: { name: 'alb-1' },
    spec: {
      mode: 'Enforce',
      targetRefs: [{ group: 'gateway.networking.k8s.io', kind: 'Gateway', name: 'alb-1' }],
      ruleSets: [
        {
          type: 'OWASPCoreRuleSet',
          owaspCoreRuleSet: {
            paranoiaLevels: { blocking: 1, detection: 1 },
            ruleExclusions: { tags: ['attack-sqli'], ids: [920100] },
          },
        },
      ],
    },
    ...overrides,
  };
}

describe('toTrafficProtectionPolicyPayload', () => {
  it('includes rule exclusions on create', () => {
    const payload = toTrafficProtectionPolicyPayload(
      'alb-1',
      'Enforce',
      { blocking: 1, detection: 1 },
      'alb-1',
      { tags: ['attack-xss'] }
    );

    expect(payload.spec?.ruleSets?.[0]?.owaspCoreRuleSet).toEqual({
      paranoiaLevels: { blocking: 1, detection: 1 },
      ruleExclusions: { tags: ['attack-xss'] },
    });
  });
});

describe('getRuleExclusions', () => {
  it('reads tags and ids from the OWASP ruleset', () => {
    expect(getRuleExclusions(policy())).toEqual({ tags: ['attack-sqli'], ids: [920100] });
  });

  it('returns undefined when no exclusions are set', () => {
    expect(
      getRuleExclusions(policy({ spec: { mode: 'Observe', targetRefs: [], ruleSets: [] } }))
    ).toBeUndefined();
  });
});

describe('toTrafficProtectionPolicySpecPatch', () => {
  it('keeps existing exclusions when the update omits them', () => {
    const patch = toTrafficProtectionPolicySpecPatch(policy(), { mode: 'Observe' });
    expect(patch.mode).toBe('Observe');
    expect(patch.ruleSets[0].owaspCoreRuleSet.ruleExclusions).toEqual({
      tags: ['attack-sqli'],
      ids: [920100],
    });
    expect(patch.ruleSets[0].owaspCoreRuleSet.paranoiaLevels).toEqual({
      blocking: 1,
      detection: 1,
    });
  });

  it('replaces exclusions when provided and nulls them when cleared', () => {
    expect(
      toTrafficProtectionPolicySpecPatch(policy(), { ruleExclusions: { tags: ['attack-xss'] } })
        .ruleSets[0].owaspCoreRuleSet.ruleExclusions
    ).toEqual({ tags: ['attack-xss'] });

    expect(
      toTrafficProtectionPolicySpecPatch(policy(), { ruleExclusions: null }).ruleSets[0]
        .owaspCoreRuleSet.ruleExclusions
    ).toBeNull();
  });
});
