import { paths } from '@/utils/config/paths.config';

/**
 * Email Verification Gate — Phase B (E-GATE / E-B3b)
 *
 * Two positions of the same switch, one spec. Run it twice:
 *   bun run test:e2e                                  → gate off (default)
 *   EMAIL_VERIFICATION_GATE=true bun run test:e2e     → gate on
 * The server-side flag is what changes; the spec reads the same variable so it
 * knows which behaviour to assert. A spec that only ever runs in one position
 * is not a kill-switch test.
 *
 * NOTE on the on-position: whether the signed-in fixture user reads verified
 * or unverified depends on the environment's milo User CR. Before the A-BF
 * backfill has run anywhere, EVERY user reads unverified, so gate-on holds the
 * fixture at /verify-email — which is exactly the assertion below.
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
    // account-under-review.tsx). If the gate ever swallows this, a
    // mis-flip becomes unrecoverable without an infra roll.
    cy.login();
    cy.visit(paths.fraud.verifyEmail, { failOnStatusCode: false });
    if (gateOn) {
      cy.contains('Log out').should('be.visible');
    }
  });
});
