import { isRowLocked } from './proxy-match';
import type { DeleteDnsRecordCriterion, IFlattenedDnsRecord } from '@/resources/dns-records';

export interface BulkDeleteGroup {
  recordSetName: string;
  recordType: string;
  /** Human label for the task queue item, e.g. "A www (2 records)". */
  label: string;
  criteria: DeleteDnsRecordCriterion[];
}

export interface BulkDeletePlan {
  /** One entry per RecordSet, in first-seen order, so each set is written once. */
  groups: BulkDeleteGroup[];
  /** Rows the plan refuses to touch: locked, SOA, or without a RecordSet to write to. */
  skipped: IFlattenedDnsRecord[];
  /** Number of records the plan will delete. */
  total: number;
}

type DeletableRow = IFlattenedDnsRecord & { recordSetName: string };

function isDeletable(row: IFlattenedDnsRecord): row is DeletableRow {
  return !!row.recordSetName && row.type !== 'SOA' && !isRowLocked(row);
}

function toCriterion(row: DeletableRow): DeleteDnsRecordCriterion {
  return { recordType: row.type, name: row.name, value: row.value, ttl: row.ttl ?? null };
}

function labelFor(recordType: string, criteria: DeleteDnsRecordCriterion[]): string {
  const name = criteria[0].name;
  return criteria.length > 1
    ? `${recordType} ${name} (${criteria.length} records)`
    : `${recordType} ${name}`;
}

/**
 * Turn a table selection into per-RecordSet delete instructions.
 *
 * The API stores records inside RecordSets and every write replaces the
 * set's whole record list, so deletes must be batched per set rather than
 * fired per row. Rows the table would never let the user delete on their
 * own (locked, SOA, no set) are set aside so the caller can say so instead
 * of failing part way through.
 */
export function planBulkDelete(rows: IFlattenedDnsRecord[]): BulkDeletePlan {
  const deletable = rows.filter(isDeletable);
  const skipped = rows.filter((row) => !isDeletable(row));

  const bySet = deletable.reduce<Map<string, DeletableRow[]>>((map, row) => {
    return new Map(map).set(row.recordSetName, [...(map.get(row.recordSetName) ?? []), row]);
  }, new Map());

  const groups = [...bySet.entries()].map(([recordSetName, setRows]) => {
    const criteria = setRows.map(toCriterion);
    return {
      recordSetName,
      recordType: setRows[0].type,
      label: labelFor(setRows[0].type, criteria),
      criteria,
    };
  });

  return { groups, skipped, total: deletable.length };
}
