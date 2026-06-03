import { parseCsvLine } from './csv.helper';

/**
 * Parse domains from CSV/TXT file content.
 * Supports formats:
 * - One domain per line
 * - Comma-separated domains
 * - CSV with header row (looks for a 'domain' column) — including the CSV
 *   produced by the domains export, whose quoted fields (e.g. a registrar
 *   name containing a comma) are parsed correctly via `parseCsvLine`.
 */
export const parseDomainsFromFile = (content: string): string[] => {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  // Detect a header row and the domain column within it.
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('domain') || firstLine.includes('name');

  let domainColumnIndex = 0;
  if (hasHeader) {
    const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    const idx = headers.findIndex((h) => h === 'domain' || h === 'name' || h === 'hostname');
    if (idx !== -1) domainColumnIndex = idx;
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const domains: string[] = [];
  const seen = new Set<string>();

  const add = (value: string | undefined) => {
    const domain = value?.trim().toLowerCase();
    if (domain && !seen.has(domain)) {
      seen.add(domain);
      domains.push(domain);
    }
  };

  for (const line of dataLines) {
    if (!line.trim()) continue;
    const columns = parseCsvLine(line);
    // With a detected header, take only the domain column; otherwise every
    // field on the line is a candidate domain (comma-separated lists).
    if (hasHeader) {
      add(columns[domainColumnIndex]);
    } else {
      columns.forEach(add);
    }
  }

  return domains;
};
