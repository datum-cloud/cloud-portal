import { resolveHostnameDnsIssue } from './hostname-dns-issue';
import type { ZoneRecords } from '@/features/edge/proxy/utils/delete-dns-preview';
import type { IFlattenedDnsRecord } from '@/resources/dns-records';
import type { ConditionLike } from '@/resources/http-proxies/http-proxy.conditions';
import { describe, expect, test } from 'bun:test';

const WRAPPED_ALIAS =
  'status 422: {"error": "RRset test.mdj-test.online. IN ALIAS: Conflicts with pre-existing RRset"}';

function record(overrides: Partial<IFlattenedDnsRecord> = {}): IFlattenedDnsRecord {
  return {
    dnsZoneId: 'mdj-test-online',
    type: 'CNAME',
    name: 'test',
    value: 'labrador.example.net.',
    rawData: {},
    ...overrides,
  } as IFlattenedDnsRecord;
}

function pendingCondition(message = 'DNS record is pending'): ConditionLike {
  return {
    type: 'DNSRecordProgrammed',
    status: 'False',
    reason: 'Pending',
    message,
  };
}

const zoneRecords = (records: IFlattenedDnsRecord[]): ZoneRecords[] => [
  { zoneDomain: 'mdj-test.online', records },
];

describe('resolveHostnameDnsIssue', () => {
  test('stays pending when DNS is still programming and the name is empty', () => {
    expect(
      resolveHostnameDnsIssue({
        hostname: 'test.mdj-test.online',
        dns: 'pending',
        condition: pendingCondition(),
        proxyName: 'record-test',
        zoneRecords: zoneRecords([]),
      })
    ).toBeUndefined();
  });

  test('treats a manual record at the hostname as a conflict while ALB DNS is pending', () => {
    const issue = resolveHostnameDnsIssue({
      hostname: 'test.mdj-test.online',
      dns: 'pending',
      condition: pendingCondition(),
      proxyName: 'record-test',
      zoneRecords: zoneRecords([record()]),
    });
    expect(issue?.label).toBe('DNS conflict');
    expect(issue?.message).toContain('test.mdj-test.online');
    expect(issue?.message).toContain('manual record');
  });

  test('reads the PowerDNS RRset error off the ALB-managed record even when the proxy stays pending', () => {
    const issue = resolveHostnameDnsIssue({
      hostname: 'test.mdj-test.online',
      dns: 'pending',
      condition: pendingCondition(),
      proxyName: 'record-test',
      zoneRecords: zoneRecords([
        record({
          type: 'ALIAS',
          managedByGateway: true,
          gatewaySourceName: 'record-test',
          status: {
            status: 'pending',
            message: WRAPPED_ALIAS,
            isProgrammed: false,
            programmedReason: 'PDNSError',
          },
        }),
      ]),
    });
    expect(issue?.label).toBe('DNS conflict');
    expect(issue?.message).not.toContain('status 422');
    expect(issue?.message).toContain('test.mdj-test.online');
  });

  test('does not flag a programmed hostname just because other records exist', () => {
    expect(
      resolveHostnameDnsIssue({
        hostname: 'test.mdj-test.online',
        dns: 'programmed',
        condition: {
          type: 'DNSRecordProgrammed',
          status: 'True',
          reason: 'DNSRecordCreated',
          message: '',
        },
        proxyName: 'record-test',
        zoneRecords: zoneRecords([
          record({ managedByGateway: true, gatewaySourceName: 'record-test' }),
        ]),
      })
    ).toBeUndefined();
  });

  test('prefers the proxy Conflict condition when the operator already classified it', () => {
    const issue = resolveHostnameDnsIssue({
      hostname: 'test.mdj-test.online',
      dns: 'pending',
      condition: {
        type: 'DNSRecordProgrammed',
        status: 'False',
        reason: 'Conflict',
        message: '',
      },
      proxyName: 'record-test',
      zoneRecords: [],
    });
    expect(issue?.label).toBe('DNS conflict');
  });
});
