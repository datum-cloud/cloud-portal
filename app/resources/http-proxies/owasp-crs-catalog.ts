import type { WafRuleExclusions } from './http-proxy.schema';

export type OwaspCrsCategory = {
  id: string;
  label: string;
  description: string;
  tags?: readonly string[];
  idRanges?: readonly string[];
};

/**
 * User-facing OWASP CRS attack categories. Each maps to a SecRuleRemoveByTag
 * (or id range) exclusion. Engine plumbing (901/905/949/959/980) is omitted.
 */
export const OWASP_CRS_CATEGORIES: readonly OwaspCrsCategory[] = [
  {
    id: 'sqli',
    label: 'SQL injection',
    description: 'Detects SQL injection in query parameters, headers, and bodies.',
    tags: ['attack-sqli'],
  },
  {
    id: 'xss',
    label: 'Cross-site scripting',
    description: 'Detects XSS payloads, including script tags and JavaScript URIs.',
    tags: ['attack-xss'],
  },
  {
    id: 'rce',
    label: 'Command injection',
    description: 'Detects Unix and Windows command injection attempts.',
    tags: ['attack-rce'],
  },
  {
    id: 'lfi',
    label: 'Path traversal',
    description: 'Detects local file inclusion and path-traversal attacks.',
    tags: ['attack-lfi'],
  },
  {
    id: 'rfi',
    label: 'Remote file inclusion',
    description: 'Detects attempts to include remote files into the application.',
    tags: ['attack-rfi'],
  },
  {
    id: 'php',
    label: 'PHP injection',
    description: 'Detects PHP code injection and PHP-specific attack patterns.',
    tags: ['attack-injection-php'],
  },
  {
    id: 'java',
    label: 'Java attacks',
    description: 'Detects Java-specific injection and deserialization attacks.',
    tags: ['attack-java'],
  },
  {
    id: 'session',
    label: 'Session fixation',
    description: 'Detects session-fixation and session-hijacking patterns.',
    tags: ['attack-session-fixation'],
  },
  {
    id: 'protocol',
    label: 'HTTP protocol attacks',
    description: 'Detects HTTP smuggling, encoding abuse, and invalid protocol use.',
    tags: ['attack-protocol'],
  },
  {
    id: 'scanner',
    label: 'Scanner detection',
    description: 'Detects known security scanners and probing tools.',
    tags: ['attack-reputation-scanner'],
  },
];

const catalogTags = new Set(OWASP_CRS_CATEGORIES.flatMap((category) => [...(category.tags ?? [])]));
const catalogIdRanges = new Set(
  OWASP_CRS_CATEGORIES.flatMap((category) => [...(category.idRanges ?? [])])
);

export function isCategoryEnabled(
  category: OwaspCrsCategory,
  exclusions?: WafRuleExclusions
): boolean {
  if (!exclusions) return true;
  if (category.tags?.some((tag) => exclusions.tags?.includes(tag))) return false;
  if (category.idRanges?.some((range) => exclusions.idRanges?.includes(range))) return false;
  return true;
}

export function disabledCategoryIds(exclusions?: WafRuleExclusions): string[] {
  return OWASP_CRS_CATEGORIES.filter((category) => !isCategoryEnabled(category, exclusions)).map(
    (category) => category.id
  );
}

export function mergeCatalogExclusions(
  existing: WafRuleExclusions | undefined,
  disabledIds: readonly string[]
): WafRuleExclusions | undefined {
  const disabled = new Set(disabledIds);
  const nextTags = (existing?.tags ?? []).filter((tag) => !catalogTags.has(tag));
  const nextIdRanges = (existing?.idRanges ?? []).filter((range) => !catalogIdRanges.has(range));

  for (const category of OWASP_CRS_CATEGORIES) {
    if (!disabled.has(category.id)) continue;
    nextTags.push(...(category.tags ?? []));
    nextIdRanges.push(...(category.idRanges ?? []));
  }

  const merged: WafRuleExclusions = {};
  if (nextTags.length > 0) merged.tags = [...new Set(nextTags)];
  if (nextIdRanges.length > 0) merged.idRanges = [...new Set(nextIdRanges)];
  if (existing?.ids?.length) merged.ids = existing.ids;

  return Object.keys(merged).length > 0 ? merged : undefined;
}
