import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Quota gating e2e — deterministic via allowance-bucket LIST intercept.
 *
 * The bucket list is stubbed so the tests don't depend on the real quota
 * state of the test project; the DNS zones page itself still loads live data.
 *
 * Scope note: only QuotaGuard surfaces are covered here. The guard fetches
 * buckets client-side (React Query), so the browser-level intercept reaches
 * it. The project quotas *page* renders from an SSR loader (`runListLoader`
 * calls the allowance-bucket service on the server), so its data never passes
 * through the browser and cannot be stubbed with cy.intercept. Its Request
 * Limit behaviour is covered deterministically by the component spec
 * `cypress/component/quotas-table.cy.tsx` instead.
 */
const BUCKETS_LIST = '**/apis/quota.miloapis.com/v1alpha1/namespaces/milo-system/allowancebuckets*';

const bucketsResponse = (available: number, projectId: string) => ({
  kind: 'AllowanceBucketList',
  apiVersion: 'quota.miloapis.com/v1alpha1',
  items: [
    {
      metadata: { uid: 'u1', name: 'bucket-abc', namespace: 'milo-system' },
      spec: {
        consumerRef: { kind: 'Project', name: projectId },
        resourceType: 'dns.networking.miloapis.com/dnszones',
      },
      status: { limit: 25, allocated: 25 - available, available, claimCount: 0, grantCount: 1 },
    },
  ],
});

describe('DNS zone quota gating', () => {
  beforeEach(() => {
    cy.login();
  });

  it('disables Add zone with a tooltip when exhausted', () => {
    cy.getProjectId().then((projectId) => {
      cy.intercept('GET', BUCKETS_LIST, { body: bucketsResponse(0, projectId) }).as('buckets');
      cy.visit(getPathWithParams(paths.project.detail.dnsZones.root, { projectId }));
      cy.wait('@buckets');
      cy.get('[data-e2e="create-dns-zone-button"]').should('be.disabled');
    });
  });

  it('stays enabled with headroom and on bucket LIST 403 (fail-open)', () => {
    cy.getProjectId().then((projectId) => {
      cy.intercept('GET', BUCKETS_LIST, { body: bucketsResponse(10, projectId) }).as('buckets');
      cy.visit(getPathWithParams(paths.project.detail.dnsZones.root, { projectId }));
      // Wait for the verdict to resolve — asserting before the response would pass
      // vacuously (fail-open renders the button enabled while the query is pending).
      cy.wait('@buckets');
      cy.get('[data-e2e="create-dns-zone-button"]').should('not.be.disabled');

      cy.intercept('GET', BUCKETS_LIST, {
        statusCode: 403,
        body: {
          kind: 'Status',
          status: 'Failure',
          code: 403,
          reason: 'Forbidden',
          message: 'forbidden',
        },
      }).as('bucketsDenied');
      cy.visit(getPathWithParams(paths.project.detail.dnsZones.root, { projectId }));
      cy.wait('@bucketsDenied');
      cy.get('[data-e2e="create-dns-zone-button"]').should('not.be.disabled');
    });
  });
});
