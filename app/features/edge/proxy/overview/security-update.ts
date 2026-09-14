import {
  type TrafficProtectionMode,
  type UpdateHttpProxyInput,
  type WafRuleExclusions,
  mergeCatalogExclusions,
} from '@/resources/http-proxies';

export interface SecuritySettings {
  mode: TrafficProtectionMode;
  level: number;
  disabledIds: readonly string[];
  hostHeader: string;
}

export interface SecurityUpdatePlan {
  modeDirty: boolean;
  levelDirty: boolean;
  exclusionsDirty: boolean;
  hostDirty: boolean;
  changeCount: number;
  /** The draft turns protection off; the caller should confirm before saving. */
  removingProtection: boolean;
  /** Mutation input for `useUpdateHttpProxy`; empty when nothing changed. */
  input: UpdateHttpProxyInput;
}

function sameSet(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * Diff the Security & WAF card's draft against the current settings and
 * build the single mutation that applies it. Protection mode, sensitivity and
 * the ruleset live on the TrafficProtectionPolicy; the Host header override is
 * a rule filter on the HTTPProxy, so both can ride in one update.
 *
 * - Switching to Disabled sends `removeTrafficProtection` and nothing else
 *   about the policy.
 * - Any other policy change resends mode, locked paranoia levels and the
 *   merged exclusions, so the current mode (Enforce or Observe) survives a
 *   level-only or ruleset-only save.
 * - Sensitivity and ruleset edits only count while protection is on.
 */
export function planSecurityUpdate(
  current: SecuritySettings & { ruleExclusions?: WafRuleExclusions },
  draft: SecuritySettings,
  permissions: { canEditWaf: boolean; canEditHost: boolean }
): SecurityUpdatePlan {
  const draftEnabled = draft.mode !== 'Disabled';
  const modeDirty = permissions.canEditWaf && draft.mode !== current.mode;
  const levelDirty = permissions.canEditWaf && draftEnabled && draft.level !== current.level;
  const exclusionsDirty =
    permissions.canEditWaf && draftEnabled && !sameSet(draft.disabledIds, current.disabledIds);
  const trimmedHostHeader = draft.hostHeader.trim();
  const hostDirty = permissions.canEditHost && trimmedHostHeader !== current.hostHeader;

  const removingProtection = modeDirty && !draftEnabled;

  const input: UpdateHttpProxyInput = {
    ...(removingProtection
      ? { removeTrafficProtection: true }
      : modeDirty || levelDirty || exclusionsDirty
        ? {
            trafficProtectionMode: draft.mode,
            paranoiaLevels: { blocking: draft.level, detection: draft.level },
            ruleExclusions:
              mergeCatalogExclusions(current.ruleExclusions, draft.disabledIds) ?? null,
          }
        : {}),
    ...(hostDirty && { hostHeader: trimmedHostHeader }),
  };

  return {
    modeDirty,
    levelDirty,
    exclusionsDirty,
    hostDirty,
    changeCount:
      (modeDirty ? 1 : 0) + (levelDirty ? 1 : 0) + (exclusionsDirty ? 1 : 0) + (hostDirty ? 1 : 0),
    removingProtection,
    input,
  };
}
