import { AlbLogsExplorer } from '@/features/edge/proxy/logs/alb-logs-explorer';
import { AlbLogsPreview } from '@/features/edge/proxy/logs/alb-logs-preview';
import { flattenLokiStreams, lastThirtyMinutes } from '@datum-cloud/datum-ui/logs';
import { queryRangeFixture } from '@datum-cloud/datum-ui/logs/fixtures';

const entries = flattenLokiStreams(queryRangeFixture).filter(
  (entry) => entry.labels.resource_name === 'gateway-eu-west'
);

// Shape the mixed fixture like the adapter output: an empty Body with the
// Envoy access-log fields on labels and the resolved host stamped on `host`.
const explorerEntries = entries.map((entry) => ({
  ...entry,
  line: '',
  labels: {
    host: 'app.example.com',
    method: 'GET',
    path: entry.labels.path ?? '/api/v1/checkout',
    response_code: '200',
    duration: '12ms',
    authority: 'origin.internal',
    requested_server_name: 'app.example.com',
  },
}));

const timeRange = lastThirtyMinutes();

describe('AlbLogsExplorer', () => {
  it('renders ALB access-log rows from a Loki query_range fixture', () => {
    cy.mount(
      <div className="flex h-[32rem] w-full flex-col">
        <AlbLogsExplorer
          entries={explorerEntries}
          timeRange={timeRange}
          filters={{}}
          search=""
          live={false}
          onTimeRangeChange={() => {}}
          onFiltersChange={() => {}}
          onSearchChange={() => {}}
          onLiveChange={() => {}}
        />
      </div>
    );

    cy.get('[data-slot="logs-explorer"]').should('exist');
    cy.get('[data-slot="logs-table"] thead th').eq(0).should('have.text', 'Time');
    cy.get('[data-slot="logs-table"] thead th').eq(1).should('have.text', 'Status');
    cy.get('[data-slot="logs-table"] thead th').eq(2).should('have.text', 'Host');
    cy.get('[data-slot="logs-table"] thead th').eq(3).should('have.text', 'Path');
    cy.get('[data-slot="logs-table"]').should('contain', 'GET');
    cy.get('[data-slot="logs-table"]').should('contain', 'app.example.com');
    cy.get('[data-slot="logs-table"]').should('contain', '/api/v1/checkout');
    cy.get('[data-slot="logs-table"]').should('not.contain', 'Service');
    cy.get('[data-slot="logs-table"]').should('not.contain', 'Severity');
    cy.get('[data-slot="logs-table"]').should('not.contain', 'Message');
    cy.get('[data-slot="logs-filters"]').should('contain', 'Method');
    cy.get('[data-slot="logs-filters"]').should('contain', 'Status code');
    // Only the first facet group is expanded by default.
    cy.get('[data-slot="logs-filters"]').contains('button', 'Host').click();
    cy.get('[data-slot="logs-filters"]').should('contain', 'app.example.com');
    cy.get('[data-slot="logs-filters"]').should('contain', 'origin.internal');
    cy.get('[data-slot="logs-search"]').should('exist');
    cy.get('[data-slot="logs-live"]').should('exist');
    cy.get('[data-slot="logs-table"] tbody tr').first().click();
    cy.get('[data-slot="logs-detail"]').should('contain', 'GET /api/v1/checkout');
    cy.get('[data-slot="logs-detail"]').should('contain', 'app.example.com');
  });
});

describe('AlbLogsPreview', () => {
  it('renders a compact table without the live toggle', () => {
    cy.mount(
      <div className="flex h-[22rem] w-full flex-col">
        <AlbLogsPreview entries={entries} />
      </div>
    );

    cy.get('[data-slot="logs-table"]').should('contain', 'GET');
    cy.get('[data-slot="logs-table"]').should('contain', '/api/v1/checkout');
    cy.get('[data-slot="logs-table"]').should('not.contain', 'Message');
    cy.get('[data-slot="logs-live"]').should('not.exist');
    cy.get('[data-slot="logs-search"]').should('not.exist');
  });
});
