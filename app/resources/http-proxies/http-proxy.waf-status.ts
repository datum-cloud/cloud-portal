import type { TrafficProtectionMode } from './http-proxy.schema';

export type ConditionLike = {
  type?: string;
  status?: string;
  reason?: string;
  message?: string;
  observedGeneration?: number;
};

export type PolicyAncestorLike = {
  conditions?: ConditionLike[];
};

export type TrafficProtectionStatusLike = {
  ancestors?: PolicyAncestorLike[];
};

/** Tenant-facing WAF readiness derived from mode + Programmed. */
export type WafProtectionState = 'disabled' | 'pending' | 'error' | 'monitoring' | 'protected';

/**
 * True when every ancestor reports Accepted=True and Programmed=True.
 * Empty ancestors means not yet programmed.
 */
export function isTrafficProtectionProgrammed(
  status: TrafficProtectionStatusLike | null | undefined
): boolean {
  const ancestors = status?.ancestors;
  if (!ancestors?.length) return false;
  return ancestors.every((ancestor) => {
    const accepted = ancestor.conditions?.find((c) => c.type === 'Accepted');
    const programmed = ancestor.conditions?.find((c) => c.type === 'Programmed');
    return accepted?.status === 'True' && programmed?.status === 'True';
  });
}

function findNonTrueProgrammed(
  status: TrafficProtectionStatusLike | null | undefined
): ConditionLike | undefined {
  for (const ancestor of status?.ancestors ?? []) {
    const programmed = ancestor.conditions?.find((c) => c.type === 'Programmed');
    if (programmed && programmed.status !== 'True') {
      return programmed;
    }
  }
  return undefined;
}

/** First non-True Programmed message, for pending/error tooltips. */
export function getTrafficProtectionProgrammedMessage(
  status: TrafficProtectionStatusLike | null | undefined
): string | undefined {
  return findNonTrueProgrammed(status)?.message;
}

/** First non-True Programmed reason (e.g. Pending, PartialFailure). */
export function getTrafficProtectionProgrammedReason(
  status: TrafficProtectionStatusLike | null | undefined
): string | undefined {
  return findNonTrueProgrammed(status)?.reason;
}

/**
 * Compose the portal Protection readiness:
 * - Disabled when mode is absent/Disabled
 * - Pending until Programmed (or Error on PartialFailure)
 * - Monitoring when Observe + Programmed
 * - Protected when Enforce + Programmed
 */
export function getWafProtectionState(
  mode: TrafficProtectionMode | undefined,
  programmed: boolean,
  programmedReason?: string
): WafProtectionState {
  if (!mode || mode === 'Disabled') return 'disabled';
  if (!programmed) {
    return programmedReason === 'PartialFailure' ? 'error' : 'pending';
  }
  if (mode === 'Observe') return 'monitoring';
  return 'protected';
}

/** Short readiness label for tooltips / a11y. */
export function formatWafProtectionStateLabel(state: WafProtectionState): string {
  switch (state) {
    case 'disabled':
      return 'Disabled';
    case 'pending':
      return 'Pending';
    case 'error':
      return 'Error';
    case 'monitoring':
      return 'Monitoring';
    case 'protected':
      return 'Protected';
  }
}

/** Tooltip copy for the in-pill readiness icon. */
export function formatWafProtectionStatusTooltip(
  state: WafProtectionState,
  programmedMessage?: string
): string | undefined {
  switch (state) {
    case 'disabled':
      return undefined;
    case 'pending':
      return programmedMessage || 'Waiting for WAF to reach the edge';
    case 'error':
      return programmedMessage || 'WAF is not programmed on all edges';
    case 'monitoring':
      return 'WAF is observing traffic on all edges';
    case 'protected':
      return 'WAF is protecting traffic on all edges';
  }
}
