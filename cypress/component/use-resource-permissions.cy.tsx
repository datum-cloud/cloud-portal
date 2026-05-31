// Import from source files (not the `@/modules/rbac` barrel): the barrel
// intentionally excludes server-only entrypoints, and these deep imports keep
// any server-only code (prom-client, axios, control-plane SDK) out of the
// browser bundle Cypress builds for component tests.
import { RbacProvider } from '@/modules/rbac/context/rbac.provider';
import { useResourcePermissions } from '@/modules/rbac/use-resource-permissions';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const ORG_ID = 'acme';
const PROJECT_ID = 'proj-1';

interface BulkCheckRequestItem {
  resource: string;
  verb: string;
  group?: string;
  namespace?: string;
  name?: string;
  scope?: string;
  projectId?: string;
}

/**
 * Renders the flag names produced by `useResourcePermissions` so the test can
 * read them back via `data-cy` selectors. The input matches a typical caller:
 * a primary resource (`httpproxies`) with two verbs and one sub-resource
 * (`trafficprotectionpolicies`, alias `waf`) with two verbs.
 *
 * Expected flag mapping (see `flagNameFor` + `SUB_RESOURCE_VERB_PREFIX`):
 *   primary list  → canList
 *   primary create → canCreate
 *   sub list  (alias waf) → canViewWaf
 *   sub patch (alias waf) → canEditWaf
 */
function Probe() {
  const perms = useResourcePermissions({
    resource: 'httpproxies',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['list', 'create'],
    subResources: [
      {
        resource: 'trafficprotectionpolicies',
        group: 'networking.datumapis.com',
        scope: 'project',
        alias: 'waf',
        verbs: ['list', 'patch'],
      },
    ],
  });
  const canList = !!perms.canList;
  const canCreate = !!perms.canCreate;
  const canViewWaf = !!perms.canViewWaf;
  const canEditWaf = !!perms.canEditWaf;
  const { isLoading } = perms;

  if (isLoading) {
    return <div data-cy="state">loading</div>;
  }

  return (
    <div data-cy="state">
      <span data-cy="canList">{String(canList)}</span>
      <span data-cy="canCreate">{String(canCreate)}</span>
      <span data-cy="canViewWaf">{String(canViewWaf)}</span>
      <span data-cy="canEditWaf">{String(canEditWaf)}</span>
    </div>
  );
}

/**
 * Build the bulk-check intercept. The BFF wire contract (see
 * `app/server/routes/permissions.ts` and `app/modules/rbac/client/rbac-api.ts`)
 * is:
 *   request:  { organizationId, checks: [{ resource, verb, group, ... }] }
 *   response: { success: true, data: { results: [{ allowed, denied, request }] } }
 *
 * `allow` is a set of `"<resource>:<verb>"` strings; any check matching one of
 * these resolves to `{ allowed: true, denied: false }`. Anything else
 * resolves to `{ allowed: false, denied: true }`. A wildcard `'*'` in `deny`
 * forces every check to be denied (mirrors the "fail closed" path).
 */
function mountProbe(intercept: { allow: string[]; deny: string[] }) {
  cy.intercept('POST', '/api/permissions/bulk-check', (req) => {
    const checks: BulkCheckRequestItem[] = Array.isArray(req.body?.checks) ? req.body.checks : [];
    const denyAll = intercept.deny.includes('*');

    req.reply({
      statusCode: 200,
      body: {
        success: true,
        data: {
          results: checks.map((c) => {
            const key = `${c.resource}:${c.verb}`;
            const allowed = !denyAll && intercept.allow.includes(key);
            return {
              allowed,
              denied: !allowed,
              request: c,
            };
          }),
        },
      },
    });
  }).as('bulk');

  // A fresh client per mount keeps cached results isolated between tests.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  cy.mount(
    <QueryClientProvider client={queryClient}>
      <RbacProvider organizationId={ORG_ID} projectId={PROJECT_ID}>
        <Probe />
      </RbacProvider>
    </QueryClientProvider>
  );

  cy.wait('@bulk');
}

describe('useResourcePermissions (Cypress)', () => {
  it('renders named flags from primary verbs', () => {
    mountProbe({ allow: ['httpproxies:list'], deny: [] });

    cy.get('[data-cy=canList]').should('have.text', 'true');
    cy.get('[data-cy=canCreate]').should('have.text', 'false');
  });

  it('renders sub-resource aliases (canViewWaf / canEditWaf)', () => {
    mountProbe({
      allow: [
        'httpproxies:list',
        'trafficprotectionpolicies:list',
        'trafficprotectionpolicies:patch',
      ],
      deny: [],
    });

    cy.get('[data-cy=canViewWaf]').should('have.text', 'true');
    cy.get('[data-cy=canEditWaf]').should('have.text', 'true');
  });

  it('reports denied flags as false', () => {
    mountProbe({ allow: [], deny: ['*'] });

    cy.get('[data-cy=canList]').should('have.text', 'false');
    cy.get('[data-cy=canCreate]').should('have.text', 'false');
    cy.get('[data-cy=canViewWaf]').should('have.text', 'false');
    cy.get('[data-cy=canEditWaf]').should('have.text', 'false');
  });
});
