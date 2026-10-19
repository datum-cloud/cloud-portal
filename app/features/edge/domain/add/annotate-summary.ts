import {
  DOMAIN_VERIFICATION_STATUS,
  type SiblingDomainMatches,
  normalizeDomainName,
} from '@/resources/domains';
import type { TaskSummaryItem } from '@datum-cloud/datum-ui/task-queue';

/** Summary-row text naming the project (and verification state) that already holds a domain. */
export const DUPLICATE_ANNOTATION = (project: string, label: string) =>
  `Also in ${project} (${label})`;

/** Returns a new array; never mutates `items`. */
export function annotateSummaryItems(
  items: TaskSummaryItem[],
  matches: SiblingDomainMatches
): TaskSummaryItem[] {
  return items.map((item) => {
    const hit = matches[normalizeDomainName(item.id)];
    if (!hit?.length) return item;

    const annotation = hit
      .map((m) =>
        DUPLICATE_ANNOTATION(
          m.projectDisplayName,
          DOMAIN_VERIFICATION_STATUS[m.verificationStatus].label
        )
      )
      .join('; ');

    return { ...item, message: item.message ? `${item.message}. ${annotation}` : annotation };
  });
}
