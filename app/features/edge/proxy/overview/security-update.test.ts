import { planSecurityUpdate, type SecuritySettings } from './security-update';
import { describe, expect, it } from 'bun:test';

const allowed = { canEditWaf: true, canEditHost: true };

const observing: SecuritySettings = {
  mode: 'Observe',
  level: 1,
  disabledIds: [],
  hostHeader: '',
};

describe('planSecurityUpdate', () => {
  it('reports no changes when the draft matches the current settings', () => {
    const plan = planSecurityUpdate(observing, { ...observing }, allowed);
    expect(plan.changeCount).toBe(0);
    expect(plan.removingProtection).toBe(false);
    expect(plan.input).toEqual({});
  });

  it('preserves Observe mode when only the sensitivity changes', () => {
    const plan = planSecurityUpdate(observing, { ...observing, level: 2 }, allowed);
    expect(plan.changeCount).toBe(1);
    expect(plan.input.trafficProtectionMode).toBe('Observe');
    expect(plan.input.paranoiaLevels).toEqual({ blocking: 2, detection: 2 });
    expect(plan.input.removeTrafficProtection).toBeUndefined();
  });

  it('preserves Enforce mode when only the ruleset changes', () => {
    const enforcing = { ...observing, mode: 'Enforce' as const };
    const plan = planSecurityUpdate(enforcing, { ...enforcing, disabledIds: ['sqli'] }, allowed);
    expect(plan.exclusionsDirty).toBe(true);
    expect(plan.input.trafficProtectionMode).toBe('Enforce');
    expect(plan.input.ruleExclusions?.tags).toContain('attack-sqli');
  });

  it('sends only removeTrafficProtection when switching to Disabled', () => {
    const plan = planSecurityUpdate(observing, { ...observing, mode: 'Disabled' }, allowed);
    expect(plan.removingProtection).toBe(true);
    expect(plan.input).toEqual({ removeTrafficProtection: true });
  });

  it('enables protection from Disabled with locked paranoia levels', () => {
    const disabled = { ...observing, mode: 'Disabled' as const };
    const plan = planSecurityUpdate(disabled, { ...disabled, mode: 'Enforce', level: 2 }, allowed);
    expect(plan.removingProtection).toBe(false);
    expect(plan.input.trafficProtectionMode).toBe('Enforce');
    expect(plan.input.paranoiaLevels).toEqual({ blocking: 2, detection: 2 });
    expect(plan.input.ruleExclusions).toBeNull();
  });

  it('ignores sensitivity and ruleset edits while protection is off', () => {
    const disabled = { ...observing, mode: 'Disabled' as const };
    const plan = planSecurityUpdate(
      disabled,
      { ...disabled, level: 2, disabledIds: ['xss'] },
      allowed
    );
    expect(plan.changeCount).toBe(0);
    expect(plan.input).toEqual({});
  });

  it('clears the host header with an explicit empty string', () => {
    const withHost = { ...observing, hostHeader: 'origin.internal' };
    const plan = planSecurityUpdate(withHost, { ...withHost, hostHeader: '  ' }, allowed);
    expect(plan.hostDirty).toBe(true);
    expect(plan.input).toEqual({ hostHeader: '' });
  });

  it('combines a policy change and a host header change in one input', () => {
    const plan = planSecurityUpdate(
      observing,
      { ...observing, mode: 'Enforce', hostHeader: 'api.internal' },
      allowed
    );
    expect(plan.changeCount).toBe(2);
    expect(plan.input.trafficProtectionMode).toBe('Enforce');
    expect(plan.input.hostHeader).toBe('api.internal');
  });

  it('drops WAF edits the viewer cannot make', () => {
    const plan = planSecurityUpdate(
      observing,
      { ...observing, mode: 'Enforce', hostHeader: 'api.internal' },
      { canEditWaf: false, canEditHost: true }
    );
    expect(plan.modeDirty).toBe(false);
    expect(plan.input).toEqual({ hostHeader: 'api.internal' });
  });
});
