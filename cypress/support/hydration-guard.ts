/**
 * Static check that an E2E spec waits for hydration before it types.
 *
 * Dashboard pages are server-rendered and visible before React hydrates, so
 * `should('be.visible')` passes while the inputs still have no handlers.
 * Typing in that window reaches the DOM but not the form state: the save then
 * sends the old value, succeeds, and the form resets to it. A click made in
 * that window is lost the same way, which is why typing into a dialog opened
 * after a visit counts too.
 *
 * The check is line-based on purpose: specs are written one command per line,
 * and a false alarm is fixed by adding `cy.waitForHydration()`, which is cheap.
 */

/** Starts a new test or hook, so an earlier test's visit no longer applies. */
const BLOCK_START = /^\s*(?:it|describe|context|before|beforeEach|after|afterEach)(?:\.\w+)?\(/;
/** Starts a test, which runs after every `beforeEach` before it in the file. */
const TEST_START = /^\s*it(?:\.\w+)?\(/;
const BEFORE_EACH_START = /^\s*beforeEach\(/;
const VISIT = /\bcy\.visit\(/;
const HYDRATION_WAIT = /\bwaitForHydration\(|html\[data-hydrated\]/;
const TYPE = /\.type\(/;

/**
 * Returns the 1-based line numbers where a spec types after `cy.visit` without
 * waiting for hydration first. Reports at most one line per visit. A visit in
 * a `beforeEach` that does not wait carries into each test after it.
 */
export function findTypingBeforeHydration(source: string): number[] {
  const offending: number[] = [];
  let visitedWithoutWait = false;
  let inBeforeEach = false;
  let beforeEachLeavesUnhydrated = false;

  source.split('\n').forEach((line, index) => {
    if (line.trim().startsWith('//')) return;

    if (BLOCK_START.test(line)) {
      inBeforeEach = BEFORE_EACH_START.test(line);
      visitedWithoutWait = TEST_START.test(line) && beforeEachLeavesUnhydrated;
    }
    if (VISIT.test(line)) visitedWithoutWait = true;
    if (HYDRATION_WAIT.test(line)) visitedWithoutWait = false;
    if (inBeforeEach) beforeEachLeavesUnhydrated = visitedWithoutWait;

    if (visitedWithoutWait && TYPE.test(line)) {
      offending.push(index + 1);
      visitedWithoutWait = false;
    }
  });

  return offending;
}
