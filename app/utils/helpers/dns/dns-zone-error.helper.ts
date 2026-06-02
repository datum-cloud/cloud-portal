import type { IExtendedControlPlaneStatus } from '@/resources/base';
import type { DnsZone } from '@/resources/dns-zones';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';

// =============================================================================
// DNS Zone Error Helpers
// =============================================================================

/**
 * Resolved error state for a DNS zone.
 *
 * Mirrors the computation used by the DNS zone list page so the list badge and
 * the detail banner can never disagree about whether a zone is errored.
 */
export interface IDnsZoneErrorState {
  hasError: boolean;
  /** Raw K8s `Programmed` condition reason (free-form string). */
  reason?: string;
  /** Raw K8s condition message surfaced by `transformControlPlaneStatus`. */
  message?: string;
}

/**
 * Human-facing remediation guidance shown in the detail banner.
 */
export interface IDnsZoneErrorGuidance {
  title: string;
  description: string;
}

/**
 * A single reason→guidance mapping rule.
 *
 * A rule matches when EITHER the K8s `reason` matches `reason` (case-insensitive)
 * OR the condition `message` matches `messagePattern`. Message matching is the
 * primary key because the control-plane types do not expose reason enums.
 */
interface DnsZoneErrorRule {
  reason?: string;
  messagePattern?: RegExp;
  guidance: IDnsZoneErrorGuidance;
}

/**
 * Known DNS zone error reasons → actionable guidance.
 *
 * NOTE: To add a new known failure mode, append a rule here. Rules are evaluated
 * top-to-bottom; the first match wins. Unknown errors fall back to the raw
 * condition message (see {@link getDnsZoneErrorGuidance}).
 */
const DNS_ZONE_ERROR_RULES: DnsZoneErrorRule[] = [
  {
    // e.g. "DNSZone claimed by another resource"
    messagePattern: /claimed by another/i,
    guidance: {
      title: 'This domain is already in use',
      description:
        'Already claimed by another DNS zone. Delete the conflicting zone (it may be in this or another project), or use a different domain name.',
    },
  },
  {
    // e.g. "invalid domain name", "not a registrable domain", public-suffix rejections
    messagePattern: /invalid domain|not a valid|not registrable|public suffix/i,
    guidance: {
      title: 'Invalid domain name',
      description:
        'Not usable as a DNS zone. Check for typos and confirm it’s a registrable domain you control.',
    },
  },
  {
    // e.g. "quota exceeded", "DNS zone limit reached", "too many zones"
    messagePattern: /quota|limit (exceeded|reached)|too many/i,
    guidance: {
      title: 'DNS zone limit reached',
      description:
        'DNS zone limit reached for this project. Delete an unused zone or ask an administrator to raise it.',
    },
  },
  {
    // e.g. "zone not delegated", "nameservers not configured", "missing NS record".
    // Patterns require an error-bearing context so a benign mention of
    // "nameserver" in some other message does not match here.
    messagePattern:
      /delegat|nameservers?\s+(not|missing|incorrect|misconfigured|need)|missing\s+ns\s+record/i,
    guidance: {
      title: 'Nameserver delegation incomplete',
      description:
        'Nameserver delegation is incomplete, so traffic isn’t flowing yet. Update the domain’s nameservers at your registrar to the values on the Nameservers tab.',
    },
  },
  {
    // Generic backend/reconciliation failure — keep LAST so specific rules win first.
    messagePattern:
      /programming failed|reconcil|internal error|provider error|failed to provision/i,
    guidance: {
      title: 'DNS zone provisioning failed',
      description:
        'Provisioning failed. Often temporary — try again shortly, or contact support if it persists.',
    },
  },
];

const GENERIC_GUIDANCE_TITLE = 'DNS Zone configuration error';
const GENERIC_GUIDANCE_FALLBACK =
  'Something is preventing this DNS zone from being provisioned. Review the configuration or contact support if the problem persists.';

/**
 * Single source of truth for "is this DNS zone errored?".
 *
 * A zone is errored when its `Programmed` condition is `False` and a reason is
 * present. Operates on an already-transformed status so callers that have one
 * (e.g. the list page) can reuse it without re-running
 * {@link transformControlPlaneStatus}.
 */
export function isDnsZoneErrored(status: IExtendedControlPlaneStatus): boolean {
  return status.isProgrammed === false && !!status.programmedReason;
}

/**
 * Compute whether a DNS zone is in an errored state.
 *
 * Convenience wrapper around {@link isDnsZoneErrored} for callers that hold the
 * raw zone rather than a transformed status (e.g. the detail banner).
 */
export function getDnsZoneErrorState(zone?: DnsZone | null): IDnsZoneErrorState {
  if (!zone) {
    return { hasError: false };
  }

  const status = transformControlPlaneStatus(zone.status, {
    includeConditionDetails: true,
  });

  if (!isDnsZoneErrored(status)) {
    return { hasError: false };
  }

  return {
    hasError: true,
    reason: status.programmedReason,
    message: status.message,
  };
}

/**
 * Map a raw error reason/message to human-facing remediation guidance.
 *
 * Falls back to the raw condition message (or a generic line) when the reason
 * is not in {@link DNS_ZONE_ERROR_RULES}.
 */
export function getDnsZoneErrorGuidance(reason?: string, message?: string): IDnsZoneErrorGuidance {
  const matched = DNS_ZONE_ERROR_RULES.find((rule) => {
    const reasonMatch = rule.reason && reason && rule.reason.toLowerCase() === reason.toLowerCase();
    const messageMatch = rule.messagePattern && message && rule.messagePattern.test(message);
    return Boolean(reasonMatch || messageMatch);
  });

  if (matched) {
    return matched.guidance;
  }

  return {
    title: GENERIC_GUIDANCE_TITLE,
    description: message?.trim() || GENERIC_GUIDANCE_FALLBACK,
  };
}
