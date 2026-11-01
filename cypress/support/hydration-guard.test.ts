import { findTypingBeforeHydration } from './hydration-guard';
import { describe, expect, it } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

describe('findTypingBeforeHydration', () => {
  it('flags typing into a page right after visiting it', () => {
    const source = [
      "it('edits', () => {",
      "  cy.visit('/org/a/general');",
      "  cy.get('[data-e2e=\"name\"]').should('be.visible').type('-x', { force: true });",
      '});',
    ].join('\n');

    expect(findTypingBeforeHydration(source)).toEqual([3]);
  });

  it('accepts typing once the test has waited for hydration', () => {
    const source = [
      "cy.visit('/org/a/general');",
      'cy.waitForHydration();',
      "cy.get('input').type('-x');",
    ].join('\n');

    expect(findTypingBeforeHydration(source)).toEqual([]);
  });

  it('accepts the raw html[data-hydrated] wait', () => {
    const source = [
      "cy.visit('/account/organizations');",
      "cy.get('html[data-hydrated]', { timeout: 10_000 });",
      "cy.get('input').type('x');",
    ].join('\n');

    expect(findTypingBeforeHydration(source)).toEqual([]);
  });

  it('flags typing into a dialog opened by a click made before hydration', () => {
    const source = [
      "cy.visit('/org/a/general');",
      'cy.get(\'[data-e2e="delete"]\').click();',
      "cy.get('[data-e2e=\"confirm\"]').type('DELETE');",
    ].join('\n');

    expect(findTypingBeforeHydration(source)).toEqual([3]);
  });

  it('checks each visit on its own', () => {
    const source = [
      "cy.visit('/a');",
      'cy.waitForHydration();',
      "cy.get('input').type('x');",
      "cy.visit('/b');",
      "cy.get('input').type('y');",
    ].join('\n');

    expect(findTypingBeforeHydration(source)).toEqual([5]);
  });

  it('does not carry a visit into the next test', () => {
    const source = [
      "it('loads', () => {",
      "  cy.visit('/a');",
      '});',
      "it('types into a dialog it opened itself', () => {",
      "  cy.get('input').type('x');",
      '});',
    ].join('\n');

    expect(findTypingBeforeHydration(source)).toEqual([]);
  });

  it('carries a beforeEach visit that does not wait into each test', () => {
    const source = [
      'beforeEach(() => {',
      "  cy.visit('/org/a/general');",
      '});',
      "it('edits', () => {",
      "  cy.get('input').type('x');",
      '});',
      "it('edits again', () => {",
      "  cy.get('input').type('y');",
      '});',
    ].join('\n');

    expect(findTypingBeforeHydration(source)).toEqual([5, 8]);
  });

  it('accepts tests after a beforeEach that waits for hydration', () => {
    const source = [
      'beforeEach(() => {',
      "  cy.visit('/org/a/general');",
      '  cy.waitForHydration();',
      '});',
      "it('edits', () => {",
      "  cy.get('input').type('x');",
      '});',
    ].join('\n');

    expect(findTypingBeforeHydration(source)).toEqual([]);
  });

  it('ignores commented-out code', () => {
    const source = ["// cy.visit('/a');", "// cy.get('input').type('x');"].join('\n');

    expect(findTypingBeforeHydration(source)).toEqual([]);
  });
});

// Server-rendered dashboard pages are visible before React hydrates. Typing in
// that window reaches the DOM but not the form state, so a save sends the old
// value and still succeeds (PR #1766, organizations and projects display-name
// specs). Every spec must wait for hydration before it types.
describe('e2e specs', () => {
  const e2eDir = fileURLToPath(new URL('../e2e', import.meta.url));
  const specs = readdirSync(e2eDir, { recursive: true })
    .map(String)
    .filter((path) => path.endsWith('.cy.ts'))
    .sort();

  it('finds the specs to check', () => {
    expect(specs.length).toBeGreaterThan(0);
  });

  it.each(specs)('%s waits for hydration before typing after a visit', (spec) => {
    const source = readFileSync(`${e2eDir}/${spec}`, 'utf8');
    expect(findTypingBeforeHydration(source)).toEqual([]);
  });
});
