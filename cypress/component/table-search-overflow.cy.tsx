import { Table, TagFilter, tagFilterParser, type ColumnDef } from '@/components/table';
import { PastInvoicesCard } from '@/features/billing/cards/past-invoices-card';
import type { PastInvoiceRow } from '@/features/billing/types';
import { QuotasTable } from '@/features/quotas/quotas-table';
import { liveUpdatesStore } from '@/modules/watch';
import { Button } from '@datum-cloud/datum-ui/button';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v8';

/**
 * Regression coverage for the `min-w-full` + trailing-content overflow bug
 * in the shared table toolbar's left group (search + live-updates control).
 * See app/components/table/components/toolbar.tsx (`TableToolbarTools`) and
 * app/components/table/components/search-input.tsx.
 *
 * Asserts, for a spread of real toolbar shapes and every breakpoint named
 * in the project's testing standard (320/375/768/1024/1440/1920), that
 * `document.body.scrollWidth - document.body.clientWidth === 0` — i.e. no
 * horizontal overflow — while the search input and any trailing toolbar
 * content stay visible and reasonably sized.
 */

const BREAKPOINTS = [320, 375, 768, 1024, 1440, 1920] as const;

const KEY = ['overflow-test', 'zone-1'] as const;

type Row = { id: string; name: string };
const columns: ColumnDef<Row>[] = [{ accessorKey: 'name', header: 'Name' }];
const rows: Row[] = [{ id: '1', name: 'Row 1' }];

function withQueryClient(children: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

const REPORT_FILE = 'cypress/results/overflow-report.txt';

/** Measures horizontal overflow + key element widths at the given viewport width. */
function assertNoOverflow(label: string) {
  cy.document().then((doc) => {
    const overflow = doc.body.scrollWidth - doc.body.clientWidth;
    const line = `${label}: overflow=${overflow}px scrollWidth=${doc.body.scrollWidth} clientWidth=${doc.body.clientWidth}\n`;
    cy.writeFile(REPORT_FILE, line, { flag: 'a+' });
    expect(overflow, `${label}: body.scrollWidth - body.clientWidth`).to.equal(0);
  });
}

function assertSearchUsable(label: string, minWidth = 60) {
  cy.get('input[type="text"]')
    .first()
    .then(($input) => {
      const width = $input[0].getBoundingClientRect().width;
      cy.writeFile(REPORT_FILE, `${label}: search input width=${width}px\n`, { flag: 'a+' });
      expect(width, `${label}: search input width`).to.be.greaterThan(minWidth);
    });
  cy.get('input[type="text"]').first().should('be.visible');
}

describe('Table toolbar — no horizontal overflow at any breakpoint', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear();
      liveUpdatesStore.__resetForTests();
    });
  });

  describe('1. Search only (Table.Client — mirrors connectors/service-accounts index)', () => {
    BREAKPOINTS.forEach((width) => {
      it(`no overflow at ${width}px`, () => {
        cy.viewport(width, 800);
        cy.mount(
          withQueryClient(
            <NuqsAdapter>
              <Table.Client<Row>
                columns={columns}
                data={rows}
                getRowId={(r) => r.id}
                urlSync={false}
                title="Search only table"
                search="Search"
              />
            </NuqsAdapter>
          )
        );
        cy.get('input[type="text"]').should('exist');
        assertSearchUsable(`search-only @ ${width}`);
        assertNoOverflow(`search-only @ ${width}`);
      });
    });
  });

  describe('2. Search + filters (Table.Client + TagFilter, no actions)', () => {
    BREAKPOINTS.forEach((width) => {
      it(`no overflow at ${width}px`, () => {
        cy.viewport(width, 800);
        cy.mount(
          withQueryClient(
            <NuqsAdapter>
              <Table.Client<Row>
                columns={columns}
                data={rows}
                getRowId={(r) => r.id}
                urlSync={false}
                title="Search + filters table"
                search="Search"
                filters={[
                  <TagFilter
                    key="type"
                    column="type"
                    label="Type"
                    options={[
                      { label: 'A', value: 'A' },
                      { label: 'MX', value: 'MX' },
                    ]}
                  />,
                ]}
                filterParsers={{ type: tagFilterParser }}
              />
            </NuqsAdapter>
          )
        );
        cy.get('input[type="text"]').should('exist');
        assertSearchUsable(`search+filters @ ${width}`);
        assertNoOverflow(`search+filters @ ${width}`);
      });
    });
  });

  describe('3. Search + filters + actions (mirrors DnsRecordTable shape, no live updates)', () => {
    BREAKPOINTS.forEach((width) => {
      it(`no overflow at ${width}px`, () => {
        cy.viewport(width, 800);
        cy.mount(
          withQueryClient(
            <NuqsAdapter>
              <Table.Client<Row>
                columns={columns}
                data={rows}
                getRowId={(r) => r.id}
                urlSync={false}
                title="Search + filters + actions table"
                search="Search"
                filters={[
                  <TagFilter
                    key="type"
                    column="type"
                    label="Type"
                    options={[
                      { label: 'A', value: 'A' },
                      { label: 'MX', value: 'MX' },
                    ]}
                  />,
                ]}
                filterParsers={{ type: tagFilterParser }}
                actions={[
                  <Button key="add" htmlType="button" type="primary" theme="solid" size="small">
                    Add record
                  </Button>,
                ]}
              />
            </NuqsAdapter>
          )
        );
        cy.get('input[type="text"]').should('exist');
        assertSearchUsable(`search+filters+actions @ ${width}`);
        assertNoOverflow(`search+filters+actions @ ${width}`);
      });
    });
  });

  describe('4. DNS records shape — search + filters + actions + live updates (chip visible)', () => {
    BREAKPOINTS.forEach((width) => {
      it(`no overflow at ${width}px`, () => {
        cy.viewport(width, 800);
        liveUpdatesStore.pause(KEY);
        cy.mount(
          withQueryClient(
            <NuqsAdapter>
              <Table.Client<Row>
                columns={columns}
                data={rows}
                getRowId={(r) => r.id}
                urlSync={false}
                title="DNS Records"
                search="Search"
                liveUpdates={{ queryKey: KEY }}
                filters={[
                  <TagFilter
                    key="type"
                    column="type"
                    label="Type"
                    options={[
                      { label: 'A', value: 'A' },
                      { label: 'MX', value: 'MX' },
                    ]}
                  />,
                ]}
                filterParsers={{ type: tagFilterParser }}
                actions={[
                  <Button key="add" htmlType="button" type="primary" theme="solid" size="small">
                    Add record
                  </Button>,
                ]}
              />
            </NuqsAdapter>
          )
        );
        cy.get('[data-e2e="live-updates-toggle"]')
          .should('exist')
          .then(() => {
            // Register + gate a few pending updates so the catch-up chip
            // (the widest trailing element — "N updates" + icon) renders,
            // reproducing the reported worst case.
            liveUpdatesStore.gate(KEY);
            liveUpdatesStore.gate(KEY);
            liveUpdatesStore.gate(KEY);
          });
        cy.get('[data-e2e="live-updates-chip"]')
          .should('be.visible')
          .and('contain.text', '3 updates');
        assertSearchUsable(`dns-records-live-updates @ ${width}`);
        // Live-updates controls must remain fully visible, not clipped.
        cy.get('[data-e2e="live-updates-toggle"]').should('be.visible');
        cy.get('[data-e2e="live-updates-chip"]').should('be.visible');
        assertNoOverflow(`dns-records-live-updates @ ${width}`);
      });
    });
  });

  describe('5. Standalone TableSearch — QuotasTable (real search-input.tsx consumer)', () => {
    BREAKPOINTS.forEach((width) => {
      it(`no overflow at ${width}px`, () => {
        cy.viewport(width, 800);
        cy.mount(
          <QuotasTable
            data={[
              {
                uid: 'u1',
                name: 'bucket-abc',
                namespace: 'milo-system',
                resourceType: 'dns.networking.miloapis.com/dnszones',
                status: { limit: 25, allocated: 10, available: 15 },
              } as any,
            ]}
            resourceType="project"
            resource={{ name: 'proj-1', displayName: 'Project One' } as any}
          />
        );
        cy.get('input[type="text"]').should('exist');
        assertSearchUsable(`quotas-table @ ${width}`);
        assertNoOverflow(`quotas-table @ ${width}`);
      });
    });
  });

  describe('6. Standalone TableSearch — PastInvoicesCard (real search-input.tsx consumer)', () => {
    const invoices: PastInvoiceRow[] = [
      { id: '1', date: '2026-01-01', amount: '$10.00', invoiceNumber: 'INV-1', status: 'paid' },
    ];

    BREAKPOINTS.forEach((width) => {
      it(`no overflow at ${width}px`, () => {
        cy.viewport(width, 800);
        cy.mount(<PastInvoicesCard invoices={invoices} />);
        cy.get('input[type="text"]').should('exist');
        assertSearchUsable(`past-invoices-card @ ${width}`);
        assertNoOverflow(`past-invoices-card @ ${width}`);
      });
    });
  });
});
