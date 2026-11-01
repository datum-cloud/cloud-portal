/**
 * Static count of skipped E2E cases, so skips cannot pile up unnoticed.
 *
 * Counts `it.skip(`, `describe.skip(`, `context.skip(` and `specify.skip(`
 * calls, ignoring commented-out lines. Line-based like hydration-guard.ts:
 * specs put one call per line.
 */

const SKIP_CALL = /\b(?:it|describe|context|specify)\.skip\(/g;
const COMMENT_LINE = /^\s*(?:\/\/|\/?\*)/;

/** Number of skip calls in a spec's source, outside commented-out lines. */
export function countSkips(source: string): number {
  return source
    .split('\n')
    .filter((line) => !COMMENT_LINE.test(line))
    .reduce((total, line) => total + (line.match(SKIP_CALL)?.length ?? 0), 0);
}
