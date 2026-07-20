import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Regression coverage for the 404 error boundary.
 *
 * Loaders throwing `NotFoundError` used to surface as 500 "Whoops! Something
 * went wrong." pages because React Router strips custom AppError fields
 * (including `status`) when serializing errors thrown from server loaders.
 *
 * Wrapping each loader with `withLoaderErrors` converts `AppError` to a
 * `Response`, which React Router treats as an `ErrorResponse` and preserves
 * both on the HTTP status of the document and on `useRouteError().status`.
 *
 * This spec verifies, for representative resource types, that:
 *   1. The document response carries HTTP 404 (not 500).
 *   2. The rendered page is the 404 view ("We couldn't find that page."),
 *      not the generic 5xx view ("Our team has been notified").
 *   3. The primary action is context-aware: org/project not-founds offer the
 *      right label and href for the organizations or projects list; other
 *      resources keep the home action. Navigation from the root error boundary
 *      is exercised via the link href (see `followPrimaryAction`).
 *
 * Selectors come from `GenericError`:
 *   [data-e2e="error-page"]                 The error card.
 *   [data-e2e="error-page-title"]           Title paragraph.
 *   [data-e2e="error-page-primary-action"]  Context-aware back button.
 *   [data-error-status]                     Status code as a string ('' when unset).
 *
 * No resources are created — each path uses a deliberately bogus ID.
 */

const MISSING_ID = 'does-not-exist-e2e-404';

type Case = {
  resource: string;
  pathOf: (projectId: string) => string;
};

const cases: Case[] = [
  {
    resource: 'AI Edge',
    pathOf: (projectId) =>
      getPathWithParams(paths.project.detail.proxy.detail.root, {
        projectId,
        proxyId: MISSING_ID,
      }),
  },
  {
    resource: 'Domain',
    pathOf: (projectId) =>
      getPathWithParams(paths.project.detail.domains.detail.overview, {
        projectId,
        domainId: MISSING_ID,
      }),
  },
  {
    resource: 'DNS Zone',
    pathOf: (projectId) =>
      getPathWithParams(paths.project.detail.dnsZones.detail.dnsRecords, {
        projectId,
        dnsZoneId: MISSING_ID,
      }),
  },
  {
    resource: 'Secret',
    pathOf: (projectId) =>
      getPathWithParams(paths.project.detail.secrets.detail.overview, {
        projectId,
        secretId: MISSING_ID,
      }),
  },
  {
    resource: 'Service Account',
    pathOf: (projectId) =>
      getPathWithParams(paths.project.detail.serviceAccounts.detail.overview, {
        projectId,
        serviceAccountId: MISSING_ID,
      }),
  },
];

/** Wait for a full document navigation away from the error page. */
const expectLeftErrorPage = (destinationPath: string) => {
  cy.location('pathname', { timeout: 20000 }).should('eq', destinationPath);
  cy.get('[data-e2e="error-page"]').should('not.exist');
};

/**
 * Assert the primary action target, then navigate via its href. React Router
 * `Link` clicks (even with `reloadDocument`) do not leave the root error
 * boundary in production SSR builds — native `<a href>` is what users get.
 */
const followPrimaryAction = (href: string, label: string) => {
  cy.get('[data-e2e="error-page-primary-action"]', { timeout: 10000 })
    .should('have.attr', 'href', href)
    .and('contain.text', label)
    .then(($el) => {
      cy.window().then((win) => {
        win.location.assign($el.attr('href')!);
      });
    });
};

describe('Not found page', () => {
  beforeEach(() => {
    cy.login();
  });

  cases.forEach(({ resource, pathOf }) => {
    it(`returns 404 with the not-found UI for a missing ${resource}`, () => {
      cy.getProjectId().then((projectId) => {
        const url = pathOf(projectId);

        // Document response must carry HTTP 404, not 500.
        cy.request({ url, failOnStatusCode: false }).its('status').should('eq', 404);

        // Rendered page must be the 404 view, not the generic 5xx view.
        cy.visit(url, { failOnStatusCode: false });
        cy.get('[data-e2e="error-page-title"]', { timeout: 10000 }).should(
          'contain.text',
          "We couldn't find that page."
        );
        cy.get('[data-e2e="error-page"]').should('not.contain.text', 'Our team has been notified');
        cy.get('[data-e2e="error-page-primary-action"]').should('contain.text', 'Organization');
      });
    });
  });

  it('sends a missing organization to the organizations list', () => {
    // `/org/:id` redirects to `/org/:id/projects`, which is where the 404 lands.
    const url = getPathWithParams(paths.org.detail.projects.root, { orgId: MISSING_ID });

    cy.request({ url, failOnStatusCode: false }).its('status').should('eq', 404);

    cy.visit(url, { failOnStatusCode: false });
    cy.get('[data-e2e="error-page"]').should('contain.text', MISSING_ID);
    cy.get('[data-e2e="error-page"]').should('contain.text', 'Organization');
    cy.get('[data-e2e="error-page"]').should('contain.text', 'not found');
    followPrimaryAction(paths.account.organizations.root, 'Organizations');
    expectLeftErrorPage(paths.account.organizations.root);
  });

  it('sends a missing project to the projects list', () => {
    cy.getPersonalOrgId().then((orgId) => {
      const projectsPath = getPathWithParams(paths.org.detail.projects.root, { orgId });

      // Pin the org session cookie so `/project` redirects here.
      cy.visit(projectsPath);

      const url = getPathWithParams(paths.project.detail.home, { projectId: MISSING_ID });

      cy.request({ url, failOnStatusCode: false }).its('status').should('eq', 404);

      cy.visit(url, { failOnStatusCode: false });
      cy.get('[data-e2e="error-page"]').should('contain.text', MISSING_ID);
      cy.get('[data-e2e="error-page"]').should('contain.text', 'Project');
      cy.get('[data-e2e="error-page"]').should('contain.text', 'not found');
      followPrimaryAction(paths.project.root, 'Projects');
      expectLeftErrorPage(projectsPath);
    });
  });
});
