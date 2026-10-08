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

/** A skipped row as the operator should read it, e.g. `{ label: 'A api', reason: '…' }`. */
export interface SkippedRecord {
  label: string;
  reason: string;
}

type DeletableRow = IFlattenedDnsRecord & { recordSetName: string };

/**
 * Whether the bulk delete may touch this row. The table uses the same rule to
 * disable a row's checkbox, so selection and the delete plan never disagree.
 */
export function canBulkDelete(row: IFlattenedDnsRecord): row is DeletableRow {
  return !!row.recordSetName && row.type !== 'SOA' && !isRowLocked(row);
}

/** Describe skipped rows for the confirmation dialog and the follow-up toast. */
export function describeSkipped(skipped: IFlattenedDnsRecord[]): SkippedRecord[] {
  return skipped.map((row) => ({
    label: `${row.type} ${row.name}`,
    reason: row.lockReason ?? "Can't be deleted here",
  }));
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
  const deletable = rows.filter(canBulkDelete);
  const skipped = rows.filter((row) => !canBulkDelete(row));

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
