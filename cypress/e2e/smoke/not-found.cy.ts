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
 *
 * Selectors come from `GenericError`:
 *   [data-e2e="error-page"]         The error card.
 *   [data-e2e="error-page-title"]   Title paragraph.
 *   [data-error-status]             Status code as a string ('' when unset).
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

describe('Not found page', () => {
  beforeEach(() => {
    cy.login();
  });

  cases.forEach(({ resource, pathOf }) => {
    it(`returns 404 with the not-found UI for a missing ${resource}`, () => {
      cy.getProjectId().then((projectId) => {
        const url = pathOf(projectId);

        // Document response must carry HTTP 404, not 500.
        cy.request({ url, failOnStatusCode: false })
          .its('status')
          .should('eq', 404);

        // Rendered page must be the 404 view, not the generic 5xx view.
        cy.visit(url, { failOnStatusCode: false });
        cy.get('[data-e2e="error-page-title"]', { timeout: 10000 }).should(
          'contain.text',
          "We couldn't find that page."
        );
        cy.get('[data-e2e="error-page"]').should(
          'not.contain.text',
          'Our team has been notified'
        );
      });
    });
  });
});
