import { WorkloadServiceFields } from '@/features/edge/proxy/form/origin-type-fields';
import { networkServiceKeys } from '@/resources/network-services/network-service.service';
import { Form } from '@datum-cloud/datum-ui/form';
import { ConformAdapter } from '@datum-cloud/datum-ui/form/adapters/conform';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { z } from 'zod';

// The compute plugin's "Add to a load balancer" opens the create dialog with
// `?workload=<name>`. The picker should come up with that workload (and its
// only port) chosen, once the project's services have loaded.
const PROJECT = 'p-1';
const schema = z.object({ serviceName: z.string().optional(), servicePort: z.string().optional() });

function service(name: string, workload: string, ports: Array<[string, number]>) {
  return {
    apiVersion: 'networking.datumapis.com/v1alpha',
    kind: 'NetworkService',
    metadata: { name, labels: { 'compute.datumapis.com/workload-name': workload } },
    spec: {
      networkInterfaces: {
        selector: { matchLabels: { 'compute.datumapis.com/workload-name': workload } },
      },
      ports: ports.map(([portName, port]) => ({ name: portName, port, protocol: 'TCP' })),
    },
  };
}

function serve(items: unknown[]) {
  cy.intercept('GET', '**/networkservices*', {
    statusCode: 200,
    body: { apiVersion: 'v1', kind: 'NetworkServiceList', metadata: {}, items },
  }).as('services');
}

function mountFields({ workload, cached }: { workload?: string; cached?: unknown[] }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  if (cached) qc.setQueryData(networkServiceKeys.list(PROJECT), cached);
  cy.mount(
    <QueryClientProvider client={qc}>
      <ConformAdapter>
        <div style={{ width: 640 }}>
          <Form.Root schema={schema} defaultValues={{}} onSubmit={() => {}}>
            <WorkloadServiceFields projectId={PROJECT} preferredWorkload={workload} />
          </Form.Root>
        </div>
      </ConformAdapter>
    </QueryClientProvider>
  );
}

describe('WorkloadServiceFields', () => {
  it('chooses the preferred workload and its only port', () => {
    serve([
      service('api', 'api', [['http', 8080]]),
      service('cpu-mem-wave', 'cpu-mem-wave', [['http', 3000]]),
    ]);
    mountFields({ workload: 'cpu-mem-wave' });
    cy.wait('@services');
    cy.get('button[role="combobox"]').eq(0).should('contain.text', 'cpu-mem-wave');
    cy.get('button[role="combobox"]').eq(1).should('contain.text', 'http · 3000');
  });

  it('leaves the port to the person when the workload has several', () => {
    serve([
      service('web', 'web', [
        ['http', 8080],
        ['admin', 9090],
      ]),
    ]);
    mountFields({ workload: 'web' });
    cy.wait('@services');
    cy.get('button[role="combobox"]').eq(0).should('contain.text', 'web');
    cy.get('button[role="combobox"]').eq(1).should('contain.text', 'Port');
  });

  it('refetches a cached list that predates the workload’s service', () => {
    serve([service('cpu-mem-wave', 'cpu-mem-wave', [['http', 3000]])]);
    mountFields({ workload: 'cpu-mem-wave', cached: [service('api', 'api', [['http', 8080]])] });
    cy.wait('@services');
    cy.get('button[role="combobox"]').eq(0).should('contain.text', 'cpu-mem-wave');
  });

  it('says so when the workload has no service', () => {
    serve([service('api', 'api', [['http', 8080]])]);
    mountFields({ workload: 'cpu-mem-wave' });
    cy.wait('@services');
    cy.contains('cpu-mem-wave has no service a load balancer can send to yet').should('be.visible');
    cy.get('button[role="combobox"]').eq(0).should('contain.text', 'Choose a workload');
  });
});
