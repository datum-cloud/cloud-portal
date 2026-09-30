import { planBulkDelete } from './bulk-delete';
import type { IFlattenedDnsRecord } from '@/resources/dns-records';
import { describe, expect, test } from 'bun:test';

function row(
  partial: Partial<IFlattenedDnsRecord> & { name: string; value: string }
): IFlattenedDnsRecord {
  return {
    dnsZoneId: 'acme-zone',
    type: 'A',
    ttl: 300,
    recordSetName: 'acme-zone-a-www',
    rawData: {},
    ...partial,
  } as IFlattenedDnsRecord;
}

describe('planBulkDelete', () => {
  test('groups selected rows by record set with one criterion per row', () => {
    const plan = planBulkDelete([
      row({ name: 'www', value: '10.0.0.1' }),
      row({ name: 'www', value: '10.0.0.2' }),
      row({ name: 'mail', value: 'mx.example.com', type: 'MX', recordSetName: 'acme-zone-mx' }),
    ]);

    expect(plan.skipped).toEqual([]);
    expect(plan.groups).toHaveLength(2);
    expect(plan.groups[0]).toEqual({
      recordSetName: 'acme-zone-a-www',
      recordType: 'A',
      label: 'A www (2 records)',
      criteria: [
        { recordType: 'A', name: 'www', value: '10.0.0.1', ttl: 300 },
        { recordType: 'A', name: 'www', value: '10.0.0.2', ttl: 300 },
      ],
    });
    expect(plan.groups[1].label).toBe('MX mail');
  });

  test('sets aside locked rows and SOA instead of trying to delete them', () => {
    const plan = planBulkDelete([
      row({ name: 'www', value: '10.0.0.1' }),
      row({ name: 'app', value: '10.0.0.9', lockReason: 'Managed by Application Load Balancer' }),
      row({ name: '@', value: 'ns1. hostmaster. 1', type: 'SOA', recordSetName: 'acme-zone-soa' }),
    ]);

    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0].criteria).toHaveLength(1);
    expect(plan.skipped.map((r) => r.name)).toEqual(['app', '@']);
  });

  test('sets aside rows that have no record set to write to', () => {
    const plan = planBulkDelete([
      row({ name: 'www', value: '10.0.0.1', recordSetName: undefined }),
    ]);

    expect(plan.groups).toEqual([]);
    expect(plan.skipped).toHaveLength(1);
  });

  test('counts the records that will actually be deleted', () => {
    const plan = planBulkDelete([
      row({ name: 'www', value: '10.0.0.1' }),
      row({ name: 'www', value: '10.0.0.2' }),
      row({ name: 'app', value: '10.0.0.9', lockReason: 'locked' }),
    ]);

    expect(plan.total).toBe(2);
  });
});
