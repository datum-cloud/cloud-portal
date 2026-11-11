import { Table } from '@/components/table';
import type { ColumnDef, RowAction } from '@/components/table';
import { PENDING_NAME_PREFIX } from '@/modules/watch/sync-state';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v8';

type Row = { id: string; name: string };

const ROWS: Row[] = [
  { id: 'alpha', name: 'Alpha' },
  { id: 'beta', name: 'Beta' },
  // A create still waiting for its server name: the table locks this row.
  { id: `${PENDING_NAME_PREFIX}gamma`, name: 'Gamma' },
];

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Name' },
  {
    id: 'extra',
    header: 'Extra',
    cell: ({ row }) => (
      <span>
        <button type="button" data-cy={`nested-${row.original.id}`}>
          Nested
        </button>
        <a href="#nested-link" data-cy={`link-${row.original.id}`}>
          Link
        </a>
      </span>
    ),
  },
];

const rowActions: RowAction<Row>[] = [
  { key: 'rename', label: 'Rename', display: 'inline', onClick: () => {} },
];

function mountTable(onRowClick?: (row: Row) => void) {
  cy.mount(
    <NuqsAdapter>
      <Table.Client<Row>
        columns={columns}
        data={ROWS}
        getRowId={(row) => row.id}
        getRowSyncKey={(row) => `thing/project-1/${row.id}`}
        rowActions={rowActions}
        onRowClick={onRowClick}
        urlSync={false}
      />
    </NuqsAdapter>
  );
}

const bodyRow = (name: string) => cy.contains('tbody tr', name);

describe('Table row keyboard access', () => {
  it('reaches a row with Tab and opens it with Enter', () => {
    const onRowClick = cy.stub().as('open');
    mountTable(onRowClick);

    // Sortable headers are focusable; the first row is the next stop after them.
    cy.get('thead [tabindex]').last().focus();
    cy.press(Cypress.Keyboard.Keys.TAB);

    cy.focused().should('match', 'tbody tr').and('contain.text', 'Alpha');
    cy.focused().type('{enter}');
    cy.get('@open').should('have.been.calledOnceWith', ROWS[0]);
  });

  it('opens a focused row with Space', () => {
    const onRowClick = cy.stub().as('open');
    mountTable(onRowClick);

    bodyRow('Beta').focus().type(' ');

    cy.get('@open').should('have.been.calledOnceWith', ROWS[1]);
  });

  it('keeps a locked row out of the tab order and closed', () => {
    const onRowClick = cy.stub().as('open');
    mountTable(onRowClick);

    bodyRow('Alpha').should('have.attr', 'tabindex', '0');
    bodyRow('Gamma').should('have.class', 'sync-locked').and('not.have.attr', 'tabindex');

    bodyRow('Gamma').trigger('keydown', { key: 'Enter' });
    bodyRow('Gamma').find('td').first().click();
    cy.get('@open').should('not.have.been.called');
  });

  it('leaves Enter on nested buttons, links and row actions to those controls', () => {
    const onRowClick = cy.stub().as('open');
    mountTable(onRowClick);

    cy.get('[data-cy=nested-alpha]').focus().type('{enter}');
    cy.get('[data-cy=link-alpha]').focus().type('{enter}');
    bodyRow('Alpha').find('[data-slot="dt-row-actions"] button').first().focus().type('{enter}');

    cy.get('@open').should('not.have.been.called');
  });

  it('adds no tab stops when rows cannot be opened', () => {
    mountTable();

    cy.get('tbody tr').should('have.length', ROWS.length);
    cy.get('tbody tr[tabindex], tbody tr[data-row-openable]').should('not.exist');
  });
});
