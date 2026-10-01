import { resolveResourceDisplayName, resolveServiceName } from '@/features/quotas/service-catalog';
import { kindToHref } from '@/features/search/shared/kindToHref';
import { isServiceVisible } from '@/modules/entitlements/entitled-services';
import type { AllowanceBucket } from '@/resources/allowance-buckets';
import { ControlPlaneStatus } from '@/resources/base';
import type { DnsZone } from '@/resources/dns-zones';
import type { Domain } from '@/resources/domains';
import {
  getCertificatesReadyCondition,
  getCertificatesReadyDisplay,
  type HttpProxy,
} from '@/resources/http-proxies';
import type { ResourceRegistration } from '@/resources/resource-registrations';
import type { SearchHit } from '@/resources/search';
import { paths } from '@/utils/config/paths.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getDnsZoneErrorGuidance, isDnsZoneErrored } from '@/utils/helpers/dns';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/** Most rows a home-page column shows before pointing at the full list. */
export const HOME_COLUMN_LIMIT = 5;

/** Newest first, capped to the column limit. */
export function newestFirst<T extends { createdAt: Date | string }>(
  items: readonly T[],
  limit = HOME_COLUMN_LIMIT
): T[] {
  return [...items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export type RecentItem = {
  key: string;
  kind: string;
  label: string;
  href: string;
};

/**
 * Recently opened search hits, as rows for the Recents column. Hits whose
 * kind has no detail page are dropped, the same way the search dropdown
 * drops them.
 */
export function toRecentItems(hits: readonly SearchHit[], limit = HOME_COLUMN_LIMIT): RecentItem[] {
  const items: RecentItem[] = [];
  for (const hit of hits) {
    const href = kindToHref(hit);
    if (!href) continue;
    items.push({ key: hit.uid, kind: hit.kind, label: hit.displayName || hit.name, href });
    if (items.length === limit) break;
  }
  return items;
}

export type QuotaItem = {
  key: string;
  label: string;
  used: number;
  limit: number;
  /** 0–100, rounded. */
  percentage: number;
};

/**
 * Quotas closest to their limit, for the Quotas column and health bar.
 * Dropped: Feature registrations (on/off flags with no countable usage),
 * buckets without a limit, and gated services the project isn't entitled
 * to, matching the Quotas page. `entitledServiceIds` of `null` means
 * entitlements are unknown and nothing is hidden for that reason.
 */
export function topQuotas(
  buckets: readonly AllowanceBucket[],
  registrations: readonly ResourceRegistration[],
  entitledServiceIds: ReadonlySet<string> | null,
  limit = HOME_COLUMN_LIMIT
): QuotaItem[] {
  const byType = new Map(registrations.map((r) => [r.resourceType, r]));
  return buckets
    .filter((bucket) => {
      const registration = byType.get(bucket.resourceType);
      return (
        registration?.type !== 'Feature' &&
        isServiceVisible(
          resolveServiceName(registration?.service, bucket.resourceType),
          entitledServiceIds
        )
      );
    })
    .flatMap((bucket): QuotaItem[] => {
      const bucketLimit = bucket.status?.limit ?? 0;
      if (bucketLimit <= 0) return [];
      const used = bucket.status?.allocated ?? 0;
      return [
        {
          key: bucket.uid,
          label: resolveResourceDisplayName(
            byType.get(bucket.resourceType)?.displayName,
            bucket.resourceType
          ),
          used,
          limit: bucketLimit,
          percentage: Math.min(100, Math.round((used / bucketLimit) * 100)),
        },
      ];
    })
    .sort((a, b) => b.percentage - a.percentage || a.label.localeCompare(b.label))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

/** Share of a quota at which the home page starts flagging it. */
export const QUOTA_WARNING_PERCENTAGE = 90;

/** A control-plane status that has finished reconciling without error. */
export function isHealthy(status: unknown): boolean {
  return transformControlPlaneStatus(status).status === ControlPlaneStatus.Success;
}

export type AttentionItem = {
  key: string;
  severity: 'error' | 'warning';
  /** Short, e.g. "testing.com isn't verified". */
  label: string;
  href: string;
};

/**
 * Everything in the project that needs someone to act, errors first. Only
 * states a person can fix are listed: a load balancer that is still
 * provisioning is left out, one that failed is not.
 */
export function attentionItems({
  projectId,
  domains,
  zones,
  proxies,
  quotas,
}: {
  projectId: string;
  domains: readonly Domain[];
  zones: readonly DnsZone[];
  proxies: readonly HttpProxy[];
  quotas: readonly QuotaItem[];
}): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const domain of domains) {
    if (isHealthy(domain.status)) continue;
    items.push({
      key: `domain:${domain.uid}`,
      severity: 'warning',
      label: `${domain.domainName} isn't verified`,
      href: getPathWithParams(paths.project.detail.domains.detail.overview, {
        projectId,
        domainId: domain.name,
      }),
    });
  }

  for (const zone of zones) {
    const status = transformControlPlaneStatus(zone.status, { includeConditionDetails: true });
    if (!isDnsZoneErrored(status)) continue;
    const guidance = getDnsZoneErrorGuidance(status.programmedReason, status.message);
    items.push({
      key: `zone:${zone.uid}`,
      severity: 'error',
      label: `${zone.domainName}: ${guidance.title}`,
      href: getPathWithParams(paths.project.detail.dnsZones.detail.root, {
        projectId,
        dnsZoneId: zone.name,
      }),
    });
  }

  for (const proxy of proxies) {
    const name = proxy.chosenName || proxy.name;
    const href = getPathWithParams(paths.project.detail.proxy.detail.overview, {
      projectId,
      proxyId: proxy.name,
    });
    // Accepted=False means the configuration was rejected and won't program
    // until someone edits it; other not-ready states are still provisioning.
    const accepted = proxy.status?.conditions?.find(
      (condition: { type: string }) => condition.type === 'Accepted'
    );
    if (accepted?.status === 'False') {
      items.push({
        key: `proxy:${proxy.uid}`,
        severity: 'error',
        label: `${name}'s configuration was rejected`,
        href,
      });
    } else if (
      getCertificatesReadyDisplay(getCertificatesReadyCondition(proxy.status)) === 'failed'
    ) {
      items.push({
        key: `proxy-cert:${proxy.uid}`,
        severity: 'error',
        label: `${name} couldn't get a certificate`,
        href,
      });
    }
  }

  for (const quota of quotas) {
    if (quota.percentage < QUOTA_WARNING_PERCENTAGE) continue;
    items.push({
      key: `quota:${quota.key}`,
      severity: quota.percentage >= 100 ? 'error' : 'warning',
      label:
        quota.percentage >= 100
          ? `${quota.label} quota is used up`
          : `${quota.label} is at ${quota.percentage}% of its quota`,
      href: getPathWithParams(paths.project.detail.quotas, { projectId }),
    });
  }

  // Stable: errors first, each group in the order above.
  return [
    ...items.filter((item) => item.severity === 'error'),
    ...items.filter((item) => item.severity === 'warning'),
  ];
}
