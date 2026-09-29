import { kindToHref } from '@/features/search/shared/kindToHref';
import type { Domain } from '@/resources/domains';
import type { SearchHit } from '@/resources/search';

/** Most rows a home-page column shows before pointing at the full list. */
export const HOME_COLUMN_LIMIT = 5;

/** Newest domains first, capped to the column limit. */
export function topDomains(domains: readonly Domain[], limit = HOME_COLUMN_LIMIT): Domain[] {
  return [...domains]
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
