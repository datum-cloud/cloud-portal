import { paths } from '@/utils/config/paths.config';

/**
 * Email verification gate — both positions of one switch, one spec.
 *
 *   bun run test:e2e                                → gate off (default, and
 *                                                     what CI runs)
 *   EMAIL_VERIFICATION_GATE=true bun run test:e2e   → gate on
 *
 * The variable reaches BOTH processes: the server reads it from its own
 * environment, and cypress.config.ts forwards it into `Cypress.env` so the spec
 * knows which behaviour to assert. Cypress only auto-imports CYPRESS_-prefixed
 * variables, so that forwarding is what keeps the two in agreement — without it
 * the spec asserts the off-position against an on-position server. A spec that
 * only ever runs in one position is not a kill-switch test.
 *
 * NOTE on the on-position: whether the signed-in fixture user reads verified or
 * unverified depends on the environment's milo User record. Before the backfill
 * has run anywhere, EVERY user reads unverified, so gate-on holds the fixture
 * at /verify-email — which is exactly the assertion below.
 */
const gateOn = Cypress.env('EMAIL_VERIFICATION_GATE') === 'true';

describe('email verification gate', () => {
  it(`${gateOn ? 'holds' : 'ignores'} a signed-in user at /verify-email`, () => {
    cy.login();
    cy.visit(paths.fraud.verifyEmail, { failOnStatusCode: false });

    if (gateOn) {
      cy.location('pathname').should('eq', paths.fraud.verifyEmail);
      cy.contains('Check your email').should('be.visible');
    } else {
      // Flag off: the page redirects home and the gate is invisible.
      cy.location('pathname').should('not.eq', paths.fraud.verifyEmail);
    }
  });

  it(`${gateOn ? 'redirects' : 'does not redirect'} a protected route`, () => {
    cy.login();
    cy.visit(paths.account.organizations.root, { failOnStatusCode: false });

    if (gateOn) {
      cy.location('pathname').should('eq', paths.fraud.verifyEmail);
    } else {
      cy.location('pathname').should('not.eq', paths.fraud.verifyEmail);
    }
  });

  it('always lets the user log out', () => {
    // The one escape hatch every blocking page keeps (verifying.tsx,
    // account-under-review.tsx). If the gate ever swallows this, a mis-flip
    // becomes unrecoverable without an infra roll.
    cy.login();

    if (gateOn) {
      cy.visit(paths.fraud.verifyEmail, { failOnStatusCode: false });
      cy.contains('Log out').should('be.visible');
    } else {
      // Gate off, so /verify-email is not where the user lands. Assert the
      // escape hatch still answers on the page they DO get, rather than
      // asserting nothing at all in the position CI actually runs.
      cy.visit(paths.account.organizations.root, { failOnStatusCode: false });
      cy.location('pathname').should('not.eq', paths.fraud.verifyEmail);
      cy.request({ url: paths.auth.logOut, followRedirect: false })
        .its('status')
        .should('be.oneOf', [200, 302]);
    }
  });
});
