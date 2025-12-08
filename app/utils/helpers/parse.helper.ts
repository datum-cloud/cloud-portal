/**
 * Parse domains from CSV/TXT file content.
 * Supports formats:
 * - One domain per line
 * - Comma-separated domains
 * - CSV with header row (looks for 'domain' column)
 */
export const parseDomainsFromFile = (content: string): string[] => {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  // Check if first line looks like a header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('domain') || firstLine.includes('name');

  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Try to detect column index if header exists
  let domainColumnIndex = 0;
  if (hasHeader) {
    const headers = firstLine.split(',').map((h) => h.trim().toLowerCase());
    const idx = headers.findIndex((h) => h === 'domain' || h === 'name' || h === 'hostname');
    if (idx !== -1) domainColumnIndex = idx;
  }

  const domains: string[] = [];

  for (const line of dataLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // If line contains comma, treat as CSV row
    if (trimmed.includes(',')) {
      const columns = trimmed.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      // If we detected a header with domain column, use that column
      if (hasHeader && columns[domainColumnIndex]) {
        const domain = columns[domainColumnIndex].toLowerCase();
        if (domain && !domains.includes(domain)) {
          domains.push(domain);
        }
      } else {
        // Otherwise treat all columns as potential domains
        for (const col of columns) {
          const domain = col.toLowerCase();
          if (domain && !domains.includes(domain)) {
            domains.push(domain);
          }
        }
      }
    } else {
      // Single domain per line
      const domain = trimmed.toLowerCase();
      if (domain && !domains.includes(domain)) {
        domains.push(domain);
      }
    }
  }

  return domains;
};
