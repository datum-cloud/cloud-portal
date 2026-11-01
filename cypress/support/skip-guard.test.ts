import { countSkips } from './skip-guard';
import { describe, expect, it } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

describe('countSkips', () => {
  it('counts skipped tests and suites', () => {
    const source = [
      "describe.skip('suite', () => {",
      "  it.skip('a', () => {});",
      "  it('b', () => {});",
      "  context.skip('c', () => {});",
      "  specify.skip('d', () => {});",
      '});',
    ].join('\n');

    expect(countSkips(source)).toBe(4);
  });

  it('ignores commented-out skips', () => {
    const source = [
      "// it.skip('a', () => {});",
      '/*',
      " * it.skip('b', () => {});",
      ' */',
      "it('c', () => {});",
    ].join('\n');

    expect(countSkips(source)).toBe(0);
  });

  it('does not count similar names', () => {
    expect(countSkips("cy.skipIt(); skip('x'); fit.skip;")).toBe(0);
  });
});

/**
 * The skips allowed in each regression spec. Each remaining skip in the RBAC
 * denial specs needs a resource the shared regression fixture does not seed
 * (a proxy, DNS record, DNS zone, domain or service account); the reason is on
 * the skipped case. Lower a number when you unskip a case; raising one needs a
 * reason in review.
 */
const ALLOWED_SKIPS: Record<string, number> = {
  'rbac-denials.cy.ts': 3,
  'rbac-denials-project.cy.ts': 7,
};

describe('regression specs', () => {
  const regressionDir = fileURLToPath(new URL('../e2e/regression', import.meta.url));
  const specs = readdirSync(regressionDir, { recursive: true })
    .map(String)
    .filter((path) => path.endsWith('.cy.ts'))
    .sort();

  it('finds the specs to check', () => {
    expect(specs.length).toBeGreaterThan(0);
  });

  it.each(specs)('%s does not skip more cases than allowed', (spec) => {
    const source = readFileSync(`${regressionDir}/${spec}`, 'utf8');
    expect(countSkips(source)).toBeLessThanOrEqual(ALLOWED_SKIPS[spec] ?? 0);
  });

  it('skips at most 10 cases in total', () => {
    const total = specs.reduce(
      (sum, spec) => sum + countSkips(readFileSync(`${regressionDir}/${spec}`, 'utf8')),
      0
    );
    expect(total).toBeLessThanOrEqual(10);
  });
});
