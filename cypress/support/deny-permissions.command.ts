/// <reference types="cypress" />
import {
  bulkCheckResults,
  checkResult,
  denyCookieValue,
  E2E_DENY_COOKIE,
  readBulkChecks,
  type DenyEntry,
  type PermissionCheckBody,
} from './deny-permissions';

/**
 * Deny the listed permissions for the rest of the test, on both sides:
 * - sets the `e2e-deny` cookie, which SSR loader gates honour when the app runs
 *   with CYPRESS=true and NODE_ENV=test (app/modules/rbac/server/e2e-deny.server.ts);
 * - overrides the ambient `/api/permissions/*` stubs from e2e.ts so client-side
 *   gates agree (a later `cy.intercept` for the same route wins).
 * Entries are `resource:verb` or `group:resource:verb`. Call after `cy.login()`:
 * `cy.session` clears cookies when it restores a session.
 */
Cypress.Commands.add('denyPermissions', (entries: DenyEntry[]) => {
  const baseUrl = Cypress.config('baseUrl');
  if (!baseUrl) {
    throw new Error('baseUrl is required in Cypress configuration');
  }
  const url = new URL(baseUrl);
  const denied = new Set<string>(entries);

  cy.setCookie(E2E_DENY_COOKIE, denyCookieValue(entries), {
    path: '/',
    domain: url.hostname,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
  });

  cy.intercept('POST', '/api/permissions/check', (req) => {
    req.reply({
      statusCode: 200,
      body: { success: true, data: checkResult(denied, req.body as PermissionCheckBody) },
    });
  }).as('permissionCheck');

  cy.intercept('POST', '/api/permissions/bulk-check', (req) => {
    req.reply({
      statusCode: 200,
      body: {
        success: true,
        data: { results: bulkCheckResults(denied, readBulkChecks(req.body)) },
      },
    });
  }).as('bulkCheck');
});

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Deny `resource:verb` (or `group:resource:verb`) permissions for this
       * test, in SSR loader gates (via the `e2e-deny` cookie) and in the
       * `/api/permissions/*` stubs (aliased `@bulkCheck`). Call after `cy.login()`.
       * @example cy.denyPermissions(['projects:create'])
       */
      denyPermissions(entries: DenyEntry[]): Chainable<void>;
    }
  }
}
