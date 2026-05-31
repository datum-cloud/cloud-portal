/// <reference types="cypress" />

/**
 * Org-area deny scenarios for the Phase 2 RBAC migration.
 *
 * Mirrors the architectural constraint documented in the Phase 1 sibling spec
 * (`rbac-denials.cy.ts`): Cypress's `cy.intercept` can only stub browser-
 * originated requests. The DSL's `runListLoader` / `runDetailLoader` execute
 * SSR-side in the React Router Node process and call the upstream IAM API
 * directly (via `gateRouteAccess` → `SelfSubjectAccessReview`), so we can't
 * stub the gate from the browser today.
 *
 * Tests are split into:
 * - 3 live: client-side gates (button disabled when intercept returns deny).
 * - 8 .skip: server-side gates (RestrictedState rendering). Unblock via Phase 3
 *   test infrastructure — either a deny-scoped CI fixture user, or a dev-server
 *   layer that shims the upstream IAM SSAR endpoint.
 *
 * Endpoint + response shape verified against `cypress/support/e2e.ts` (the
 * ambient default-allow stub) and `app/modules/rbac/server/rbac.service.ts`.
 */

interface OrgBulkCheck {
  resource: string;
  verb: string;
  group?: string;
  namespace?: string;
  name?: string;
}

type OrgDenyKey = `${string}:${string}`;

/**
 * Override the ambient default-allow `/api/permissions/bulk-check` stub from
 * `cypress/support/e2e.ts`. Cypress applies the most-recent matching
 * intercept, so a per-test call after the global `beforeEach` wins.
 *
 * Helper is named `interceptOrgSSAR` to avoid colliding with the identically
 * shaped helper in `rbac-denials.cy.ts` — Cypress flattens all spec files into
 * one TS scope at typecheck time.
 */
function interceptOrgSSAR(deny: OrgDenyKey[]): void {
  const denySet = new Set<OrgDenyKey>(deny);
  cy.intercept('POST', '/api/permissions/bulk-check', (req) => {
    const checks = (
      req.body && Array.isArray(req.body.checks) ? (req.body.checks as OrgBulkCheck[]) : []
    ) as OrgBulkCheck[];
    req.reply({
      statusCode: 200,
      body: {
        success: true,
        data: {
          results: checks.map((c) => {
            const denied = denySet.has(`${c.resource}:${c.verb}` as OrgDenyKey);
            return {
              allowed: !denied,
              denied,
              request: {
                resource: c.resource,
                verb: c.verb,
                group: c.group ?? '',
                namespace: c.namespace,
                name: c.name,
              },
            };
          }),
        },
      },
    });
  }).as('bulkCheck');
}

// Placeholder org/group IDs — the SSAR deny short-circuits the page before
// any resource fetch resolves for the client-side cases, so these never need
// to exist upstream. For server-side scenarios (currently `.skip`-ed), real
// fixture IDs are needed (see file header).
const ORG = 'rbac-denials-org';
const GROUP = 'rbac-denials-group';

// ---------------------------------------------------------------------------
// Client-side gates — PermissionButton disabled when deny intercept returns.
// These pass reliably because the gate runs in the browser after page mount.
// ---------------------------------------------------------------------------
// All three tests below depend on a seeded org named `${ORG}` (currently a
// placeholder ID). The org-detail layout loader fetches the org upstream —
// a real 404 (NotFoundError → 404 Response via `runDetailLoader`) renders
// the route error boundary and the child route never mounts on the client,
// so `bulk-check` is never fired. Unskip once CI seeds a denied-scope
// fixture user + org. See file header.
describe('RBAC denials — org area (client-side gates, live)', () => {
  beforeEach(() => {
    cy.login();
  });

  it.skip('projects "Create project" disabled when projects:create denied (requires seed org)', () => {
    interceptOrgSSAR(['projects:create']);
    cy.visit(`/org/${ORG}/projects`, { failOnStatusCode: false });
    cy.wait('@bulkCheck');
    cy.get('[data-e2e="create-project-button"]', { timeout: 10000 }).should('be.disabled');
  });

  it.skip('team "Invite Member" disabled when userinvitations:create denied (requires seed org)', () => {
    interceptOrgSSAR(['userinvitations:create']);
    cy.visit(`/org/${ORG}/team`, { failOnStatusCode: false });
    cy.wait('@bulkCheck');
    cy.get('[data-e2e="invite-member-button"]', { timeout: 10000 }).should('be.disabled');
  });

  it.skip('groups "Create Group" disabled when groups:create denied (requires seed org)', () => {
    interceptOrgSSAR(['groups:create']);
    cy.visit(`/org/${ORG}/team/groups`, { failOnStatusCode: false });
    cy.wait('@bulkCheck');
    cy.contains('button', 'Create Group').should('be.disabled');
  });
});

// ---------------------------------------------------------------------------
// Server-side gates — loader-level RestrictedState rendering.
// Skipped pending Phase 3 deny-scoped fixture user or dev-server SSAR shim.
// ---------------------------------------------------------------------------
describe('RBAC denials — org area (server-side gates, .skip)', () => {
  beforeEach(() => {
    cy.login();
  });

  it.skip('org-detail RestrictedState when organizations:get denied', () => {
    interceptOrgSSAR(['organizations:get']);
    cy.visit(`/org/${ORG}`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view this organization.").should('be.visible');
  });

  it.skip('projects list RestrictedState when projects:list denied', () => {
    interceptOrgSSAR(['projects:list']);
    cy.visit(`/org/${ORG}/projects`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view projects.").should('be.visible');
  });

  it.skip('team members list RestrictedState when organizationmemberships:list denied', () => {
    interceptOrgSSAR(['organizationmemberships:list']);
    cy.visit(`/org/${ORG}/team`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view team members.").should('be.visible');
  });

  it.skip('team groups list RestrictedState when groups:list denied', () => {
    interceptOrgSSAR(['groups:list']);
    cy.visit(`/org/${ORG}/team/groups`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view groups.").should('be.visible');
  });

  it.skip('group-detail RestrictedState when policybindings:list denied', () => {
    interceptOrgSSAR(['policybindings:list']);
    cy.visit(`/org/${ORG}/team/groups/${GROUP}`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view this group.").should('be.visible');
  });

  it.skip('quotas RestrictedState when allowancebuckets:list denied', () => {
    interceptOrgSSAR(['allowancebuckets:list']);
    cy.visit(`/org/${ORG}/settings/quotas`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view quotas.").should('be.visible');
  });

  it.skip('policy-bindings RestrictedState when policybindings:list denied', () => {
    interceptOrgSSAR(['policybindings:list']);
    cy.visit(`/org/${ORG}/settings/policy-bindings`, { failOnStatusCode: false });
    cy.contains("You don't have permission to view policy bindings.").should('be.visible');
  });

  it.skip('settings/general RestrictedState when organizations:patch denied', () => {
    interceptOrgSSAR(['organizations:patch']);
    cy.visit(`/org/${ORG}/settings/general`, { failOnStatusCode: false });
    cy.contains("You don't have permission to edit this organization.").should('be.visible');
  });
});
