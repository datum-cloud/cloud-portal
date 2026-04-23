import { DataTable, useDataTableRows } from '@datum-cloud/datum-ui/data-table';
import type { ContentProps } from '@datum-cloud/datum-ui/data-table';
import { useCallback } from 'react';

interface TableContentProps<TData> extends ContentProps<TData> {
  onRowClick?: (row: TData) => void;
}

export function TableContent<TData>({ onRowClick, ...contentProps }: TableContentProps<TData>) {
  const { rows } = useDataTableRows<TData>();

  // Index mapping assumes tbody children are 1:1 with rows (no inline content rows).
  // Do not use onRowClick and inlineContent together on the same Table.Client.
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onRowClick) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-slot="checkbox"]')) return;
      if (target.closest('[data-slot="actions"]')) return;
      const tr = target.closest('tbody tr');
      if (!tr) return;
      const tbody = tr.closest('tbody');
      if (!tbody) return;
      const index = Array.from(tbody.children).indexOf(tr as HTMLTableRowElement);
      const row = rows[index];
      if (row) onRowClick(row.original);
    },
    [onRowClick, rows]
  );

  // DataTable.Content is declared without a generic in datum-ui; cast is safe at runtime.
  const props = contentProps as ContentProps;

  if (!onRowClick) {
    return <DataTable.Content {...props} />;
  }

  return (
    <div onClick={handleClick} className="[&_tbody_tr]:cursor-pointer">
      <DataTable.Content {...props} />
    </div>
  );
}
