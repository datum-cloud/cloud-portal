import { QuotaExhaustedAlert } from '@/modules/quota';
import { RbacProvider } from '@/modules/rbac';
import { allowanceBucketKeys } from '@/resources/allowance-buckets';
import { resourceRegistrationKeys } from '@/resources/resource-registrations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const RT = {
  resource: 'dnszones',
  group: 'dns.networking.miloapis.com',
  scope: 'project' as const,
};
const bucket = (available: number) => ({
  uid: 'u',
  name: 'bucket-abc',
  namespace: 'milo-system',
  resourceType: 'dns.networking.miloapis.com/dnszones',
  status: { limit: 25, allocated: 25 - available, available },
});

function mountAlert(buckets: unknown[] | undefined) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  if (buckets) qc.setQueryData(allowanceBucketKeys.list('project', 'proj-1'), buckets);
  qc.setQueryData(resourceRegistrationKeys.list('project', 'proj-1'), []);
  cy.mount(
    <QueryClientProvider client={qc}>
      <RbacProvider organizationId="org-1" projectId="proj-1">
        <QuotaExhaustedAlert {...RT} />
      </RbacProvider>
    </QueryClientProvider>
  );
}

describe('QuotaExhaustedAlert', () => {
  it('renders nothing when quota is available or unknown', () => {
    mountAlert([bucket(15)]);
    cy.get('[data-e2e="quota-exhausted-alert"]').should('not.exist');
    mountAlert([]);
    cy.get('[data-e2e="quota-exhausted-alert"]').should('not.exist');
  });
  it('renders usage numbers and CTAs when exhausted', () => {
    mountAlert([bucket(0)]);
    cy.get('[data-e2e="quota-exhausted-alert"]').should('contain.text', '25/25');
    cy.get('[data-e2e="quota-alert-view-quotas"]')
      .should('have.attr', 'href')
      .and('include', '/quotas');
    cy.get('[data-e2e="quota-alert-request-increase"]').should('exist');
  });
});
