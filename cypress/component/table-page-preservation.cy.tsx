import { Table } from '@/components/table';
import type { ColumnDef } from '@/components/table';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v8';
import { useState } from 'react';

type Row = { id: string; name: string };

const columns: ColumnDef<Row>[] = [{ accessorKey: 'name', header: 'Name' }];

const makeRows = (count: number): Row[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${i}`, name: `Row ${i}` }));

/**
 * Harness that swaps in a new data array identity on demand, standing in
 * for a watch event landing while the reader is on a later page.
 */
function Harness() {
  const [rows, setRows] = useState<Row[]>(() => makeRows(30));
  return (
    <>
      <button
        data-cy="add-row"
        onClick={() => setRows((r) => [...r, { id: `${r.length}`, name: `Row ${r.length}` }])}>
        add
      </button>
      <Table.Client<Row>
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        pageSize={10}
        urlSync={false}
      />
    </>
  );
}

describe('Table.Client page preservation', () => {
  it('stays on the current page when the data array identity changes', () => {
    // Table.Client calls datum-ui's useNuqsAdapter unconditionally
    // (urlSync only gates whether cloud-portal *uses* the adapter's
    // read/write, not whether the hook runs) so a NuqsAdapter ancestor is
    // required to mount at all, matching the provider app/root.tsx installs
    // above every route.
    cy.mount(
      <NuqsAdapter>
        <Harness />
      </NuqsAdapter>
    );

    cy.get('[aria-label="Page 2"]').click();
    cy.contains('Row 10').should('be.visible');

    cy.get('[data-cy=add-row]').click();

    cy.contains('Row 10').should('be.visible');
    cy.contains('Row 0').should('not.exist');
  });
});
