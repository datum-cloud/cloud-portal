/// <reference types="cypress" />

/**
 * Register `cy.expectRestricted`. Called from `e2e.ts` through an imported
 * binding, like `registerDenyPermissionsCommand`, so the Vite support bundle
 * keeps it.
 */
export function registerExpectRestrictedCommand(): void {
  Cypress.Commands.add('expectRestricted', (message: string) => {
    cy.location('pathname').then((pathname) => {
      cy.get('body', { timeout: 10000 }).should(($body) => {
        const text = $body.text().replace(/\s+/g, ' ').trim();
        expect(
          text,
          `restricted copy at ${pathname}; page text starts: ${text.slice(0, 600)}`
        ).to.include(message);
      });
    });
    cy.contains(message).should('be.visible');
  });
}

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Assert that a RestrictedState with this message is visible. On failure
       * the error names the current path and quotes the page text, so a CI log
       * shows what rendered instead of the restricted state.
       */
      expectRestricted(message: string): Chainable<void>;
    }
  }
}
