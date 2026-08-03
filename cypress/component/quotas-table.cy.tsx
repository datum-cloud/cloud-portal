import { QuotasTable } from '@/features/quotas/quotas-table';
import type { AllowanceBucket } from '@/resources/allowance-buckets';
import type { Project } from '@/resources/projects';

/**
 * Deterministic replacement for the former e2e assertion "shows Request Limit
 * on the quotas page for an exhausted bucket": the project quotas route renders
 * from an SSR loader whose bucket fetch happens server-side, so cy.intercept
 * can never stub it in e2e. QuotasTable is the component that owns the
 * Request Limit button, so we assert on it directly with fixture data.
 */

const project = { name: 'proj-1', displayName: 'Project One' } as Project;

const bucket = (available: number): AllowanceBucket => ({
  uid: 'u1',
  name: 'bucket-abc',
  namespace: 'milo-system',
  resourceType: 'dns.networking.miloapis.com/dnszones',
  status: { limit: 25, allocated: 25 - available, available },
});

describe('QuotasTable', () => {
  it('shows Request Limit for an exhausted bucket', () => {
    cy.mount(<QuotasTable data={[bucket(0)]} resourceType="project" resource={project} />);
    cy.get('[data-e2e="project-quota-request-limit-button"]').should('be.visible');
  });

  it('hides Request Limit when the bucket has headroom', () => {
    cy.mount(<QuotasTable data={[bucket(15)]} resourceType="project" resource={project} />);
    cy.get('[data-e2e="project-quota-usage"]').should('exist');
    cy.get('[data-e2e="project-quota-request-limit-button"]').should('not.exist');
  });
});
