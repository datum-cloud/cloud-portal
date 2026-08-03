import { QuotaGuard } from '@/modules/quota';
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

function mountGuard(buckets: unknown[] | undefined, mode?: 'disable' | 'hide' | 'fallback') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  if (buckets) qc.setQueryData(allowanceBucketKeys.list('project', 'proj-1'), buckets);
  qc.setQueryData(resourceRegistrationKeys.list('project', 'proj-1'), []);
  cy.mount(
    <QueryClientProvider client={qc}>
      <RbacProvider organizationId="org-1" projectId="proj-1">
        <QuotaGuard {...RT} mode={mode}>
          <button data-e2e="target">Add zone</button>
        </QuotaGuard>
      </RbacProvider>
    </QueryClientProvider>
  );
}

describe('QuotaGuard', () => {
  it('renders children unmodified when quota is available', () => {
    mountGuard([bucket(15)]);
    cy.get('[data-e2e="target"]').should('not.be.disabled');
    cy.get('span[aria-disabled]').should('not.exist');
  });
  it('renders children unmodified when no bucket exists (fail-open)', () => {
    mountGuard([]);
    cy.get('[data-e2e="target"]').should('not.be.disabled');
  });
  it('disables + tooltip when exhausted', () => {
    mountGuard([bucket(0)]);
    cy.get('[data-e2e="target"]').should('be.disabled');
    cy.get('span[aria-disabled]').should('exist');
  });
  it('hide mode renders nothing when exhausted', () => {
    mountGuard([bucket(0)], 'hide');
    cy.get('[data-e2e="target"]').should('not.exist');
  });
});
