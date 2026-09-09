import { getWafDialogDefaults } from './proxy-waf-dialog';
import { disabledCategoryIds } from '@/resources/http-proxies';
import { describe, expect, it } from 'bun:test';

describe('getWafDialogDefaults', () => {
  it('opens Disabled protection with the enable switch off', () => {
    expect(
      getWafDialogDefaults({
        trafficProtectionMode: 'Disabled',
        paranoiaLevels: { blocking: 1, detection: 1 },
      })
    ).toEqual({
      enabled: false,
      trafficProtectionMode: 'Enforce',
      paranoiaLevelBlocking: 1,
    });
  });

  it('opens missing protection as disabled', () => {
    expect(getWafDialogDefaults({})).toEqual({
      enabled: false,
      trafficProtectionMode: 'Enforce',
      paranoiaLevelBlocking: 1,
    });
  });

  it('preserves Enforce mode when protection is active', () => {
    expect(
      getWafDialogDefaults({
        trafficProtectionMode: 'Enforce',
        paranoiaLevels: { blocking: 2, detection: 2 },
      })
    ).toEqual({
      enabled: true,
      trafficProtectionMode: 'Enforce',
      paranoiaLevelBlocking: 2,
    });
  });

  it('preserves Observe mode when protection is active', () => {
    expect(
      getWafDialogDefaults({
        trafficProtectionMode: 'Observe',
        paranoiaLevels: { blocking: 1, detection: 1 },
      })
    ).toEqual({
      enabled: true,
      trafficProtectionMode: 'Observe',
      paranoiaLevelBlocking: 1,
    });
  });

  it('maps excluded OWASP tags to disabled category ids', () => {
    expect(disabledCategoryIds({ tags: ['attack-sqli', 'attack-xss'] })).toEqual(['sqli', 'xss']);
  });
});
