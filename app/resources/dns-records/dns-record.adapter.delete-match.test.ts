import { matchesDeleteCriterion } from './dns-record.adapter';
import { describe, expect, test } from 'bun:test';

const record = { type: 'A', name: 'www', value: '10.0.0.1', ttl: 300 };

describe('matchesDeleteCriterion', () => {
  test('matches on type, name, value and ttl', () => {
    expect(
      matchesDeleteCriterion(record, { recordType: 'A', name: 'www', value: '10.0.0.1', ttl: 300 })
    ).toBe(true);
  });

  test('treats a missing ttl on either side as null', () => {
    expect(
      matchesDeleteCriterion(
        { ...record, ttl: undefined },
        { recordType: 'A', name: 'www', value: '10.0.0.1', ttl: null }
      )
    ).toBe(true);
    expect(
      matchesDeleteCriterion(
        { ...record, ttl: undefined },
        { recordType: 'A', name: 'www', value: '10.0.0.1' }
      )
    ).toBe(true);
  });

  test('rejects a record that differs in any field', () => {
    expect(
      matchesDeleteCriterion(record, { recordType: 'A', name: 'www', value: '10.0.0.2', ttl: 300 })
    ).toBe(false);
    expect(
      matchesDeleteCriterion(record, {
        recordType: 'AAAA',
        name: 'www',
        value: '10.0.0.1',
        ttl: 300,
      })
    ).toBe(false);
    expect(
      matchesDeleteCriterion(record, { recordType: 'A', name: 'www', value: '10.0.0.1', ttl: 60 })
    ).toBe(false);
  });
});
