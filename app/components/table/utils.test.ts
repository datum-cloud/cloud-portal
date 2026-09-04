// app/components/table/utils.test.ts
import type { TableClientProps, TableServerProps, TableSharedProps } from './types';
import { detectToolbar } from './utils';
import { describe, expect, it } from 'bun:test';

type Row = { id: string };

const baseProps: TableSharedProps<Row> = { columns: [] };

// Type-level guard, enforced by `bun run typecheck`, not by an assertion.
// Table.Server counts `liveUpdates` towards rendering the toolbar but has no
// toggle and no banner to put in it, so accepting the prop there would give a
// consumer a toolbar row out of nowhere while the watch layer silently held
// their updates. It belongs to Table.Client only.
const clientAcceptsLiveUpdates: TableClientProps<Row> = {
  columns: [],
  data: [],
  liveUpdates: { queryKey: ['dns-records'] },
};

const serverRejectsLiveUpdates: TableServerProps<Row> = {
  columns: [],
  fetchFn: async () => ({}),
  transform: () => ({ data: [], total: 0, hasNextPage: false }),
  // @ts-expect-error liveUpdates is client-only — see TableClientProps.
  liveUpdates: { queryKey: ['dns-records'] },
};

void clientAcceptsLiveUpdates;
void serverRejectsLiveUpdates;

describe('detectToolbar', () => {
  it('returns false when no toolbar-rendering prop is set', () => {
    expect(detectToolbar(baseProps)).toBe(false);
  });

  it('returns true when title is set', () => {
    expect(detectToolbar({ ...baseProps, title: 'Records' })).toBe(true);
  });

  it('returns true when description is set', () => {
    expect(detectToolbar({ ...baseProps, description: 'All records' })).toBe(true);
  });

  it('returns true when search is set', () => {
    expect(detectToolbar({ ...baseProps, search: true })).toBe(true);
  });

  it('returns false when filters is an empty array', () => {
    expect(detectToolbar({ ...baseProps, filters: [] })).toBe(false);
  });

  it('returns true when filters is non-empty', () => {
    expect(detectToolbar({ ...baseProps, filters: ['filter'] })).toBe(true);
  });

  it('returns true when actions is set', () => {
    expect(detectToolbar({ ...baseProps, actions: 'action' })).toBe(true);
  });

  it('returns true when headerExtra is set', () => {
    expect(detectToolbar({ ...baseProps, headerExtra: 'extra' })).toBe(true);
  });

  it('returns true when only liveUpdates is set', () => {
    // A table with no title, search, filters, actions, or headerExtra, but
    // opted into live updates, must still render the toolbar — otherwise
    // LiveUpdatesToggle never mounts and a reader gets a chip with no
    // control beside it to pause/resume.
    expect(detectToolbar({ ...baseProps, liveUpdates: { queryKey: ['dns-records'] } })).toBe(true);
  });
});
