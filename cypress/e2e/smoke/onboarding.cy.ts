import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Onboarding — smoke.
 *
 * Two things this suite guards, both fast and repeatable on every build:
 *
 * 1. Route gating on `/onboarding/*` (`resolveOnboardingLayoutRedirect`).
 *    Cheap and precise — no dialog flows involved.
 *
 * 2. The actual "become a paying, working customer" path: create an org,
 *    attach a billing contact + real Stripe test card, then provision a
 *    project in it. This is the same `OrgBillingSetupForm` component the
 *    real `/onboarding/billing` page renders, exercised via
 *    `cy.createStandardOrg` / `cy.createProjectInOrg` — so a regression in
 *    org creation, billing-account creation, or payment-method attachment
 *    fails this suite on every build, not just when someone happens to run
 *    the regression suite.
 *
 * NOT covered here: the `/onboarding/profile` (name) and `/onboarding/account`
 * (country) steps. Those only render for a user with zero orgs and
 * `nameReviewRequired: true` — a one-time state the CI fixture user
 * (ACCESS_TOKEN/SUB) permanently leaves after its first run. Exercising them
 * for real would need a disposable, never-before-seen IAM identity
 * provisioned per run; decided against that infra for now and sticking with
 * the existing fixture user. The redirect gate itself is still covered, both
 * here (below) and in `onboarding-layout-redirect.test.ts`.
 */
describe('Onboarding — smoke', () => {
  describe('route gating', () => {
    it('redirects unauthenticated users away from onboarding routes', () => {
      cy.request({
        url: paths.onboarding.billing,
        followRedirect: false,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(302);
      });
    });

    it('redirects an already-onboarded user away from onboarding steps', () => {
      cy.login();

      // Regression guard for #1415: an existing-org user hitting the
      // in-progress-signup steps should bounce out of `/onboarding`, not
      // render them. `paths.home` ('/') itself redirects onward, so assert
      // on leaving onboarding rather than the exact landing path.
      cy.visit(paths.onboarding.account);
      cy.url().should('not.include', '/onboarding');

      cy.visit(paths.onboarding.billing);
      cy.url().should('not.include', '/onboarding');
    });
  });

  describe('org + billing + payment + project', () => {
    beforeEach(() => {
      cy.login();
    });

    it('creates an org with a billing account and payment method, then provisions a project', () => {
      const orgName = `e2e-onboarding-org-${Date.now()}`;
      const projectName = `e2e-onboarding-project-${Date.now()}`;

      // completeOrgPaymentMethod (inside createStandardOrg) already asserts
      // [data-e2e="org-billing-payment-summary"] renders — proof the org has
      // a billing account with an active payment method before we continue.
      cy.createStandardOrg(orgName).then((orgId) => {
        cy.createProjectInOrg(orgId, projectName).then((projectId) => {
          cy.visit(getPathWithParams(paths.project.detail.home, { projectId }));
          cy.url().should('include', `/project/${projectId}/home`);
        });
      });
    });
  });
});
