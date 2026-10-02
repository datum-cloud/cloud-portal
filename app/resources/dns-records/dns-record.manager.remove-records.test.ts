/// <reference types="bun-types/test" />
import { DnsRecordManager, RecordNotFoundError } from './dns-record.manager';
import type { DnsRecordSet } from './dns-record.schema';
import type { DnsRecordService } from './dns-record.service';
import { describe, expect, it, mock } from 'bun:test';

mock.module('@/modules/logger', () => ({
  logger: {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    request: mock(() => {}),
    api: mock(() => {}),
    service: mock(() => {}),
  },
}));

function recordSet(records: DnsRecordSet['records']): DnsRecordSet {
  return {
    uid: 'acme-zone-a-www',
    name: 'acme-zone-a-www',
    namespace: 'default',
    resourceVersion: '1',
    createdAt: new Date('2026-01-01'),
    dnsZoneId: 'acme-zone',
    recordType: 'A',
    records,
  };
}

const THREE_A_RECORDS = recordSet([
  { name: 'www', ttl: 300, a: { content: '10.0.0.1' } },
  { name: 'www', ttl: 300, a: { content: '10.0.0.2' } },
  { name: 'api', ttl: 300, a: { content: '10.0.0.3' } },
]);

function stubService(set: DnsRecordSet) {
  const get = mock(async () => set);
  const update = mock(async (_p: string, name: string, input: { records: unknown[] }) =>
    recordSet(input.records as DnsRecordSet['records'])
  );
  const del = mock(async () => undefined);
  const service = {
    get,
    update,
    delete: del,
    list: mock(),
    fetchList: mock(),
    listRaw: mock(),
    fetchOne: mock(),
    getStatus: mock(),
    create: mock(),
    listByTypeAndZone: mock(),
  } as unknown as DnsRecordService;
  return { service, get, update, del };
}

const criterion = (name: string, value: string) => ({
  recordSetName: 'acme-zone-a-www',
  recordType: 'A',
  name,
  value,
  ttl: 300,
});

describe('DnsRecordManager.removeRecords', () => {
  it('removes several records from one set with a single read and a single write', async () => {
    const { service, get, update, del } = stubService(THREE_A_RECORDS);
    const manager = new DnsRecordManager(service);

    const result = await manager.removeRecords('proj', 'acme-zone-a-www', [
      criterion('www', '10.0.0.1'),
      criterion('api', '10.0.0.3'),
    ]);

    expect(result).toEqual({ action: 'recordsRemoved', removed: 2 });
    expect(get).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][2]).toEqual({
      records: [{ name: 'www', ttl: 300, a: { content: '10.0.0.2' } }],
    });
    expect(del).not.toHaveBeenCalled();
  });

  it('deletes the whole set when every record in it is selected', async () => {
    const { service, update, del } = stubService(THREE_A_RECORDS);
    const manager = new DnsRecordManager(service);

    const result = await manager.removeRecords('proj', 'acme-zone-a-www', [
      criterion('www', '10.0.0.1'),
      criterion('www', '10.0.0.2'),
      criterion('api', '10.0.0.3'),
    ]);

    expect(result).toEqual({ action: 'recordSetDeleted', removed: 3 });
    expect(del).toHaveBeenCalledWith('proj', 'acme-zone-a-www');
    expect(update).not.toHaveBeenCalled();
  });

  it('writes nothing and reports the missing record when a criterion matches no record', async () => {
    const { service, update, del } = stubService(THREE_A_RECORDS);
    const manager = new DnsRecordManager(service);

    await expect(
      manager.removeRecords('proj', 'acme-zone-a-www', [
        criterion('www', '10.0.0.1'),
        criterion('ghost', '10.9.9.9'),
      ])
    ).rejects.toBeInstanceOf(RecordNotFoundError);

    expect(update).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it('removes only one entry when two criteria describe the same record', async () => {
    const { service, update } = stubService(THREE_A_RECORDS);
    const manager = new DnsRecordManager(service);

    const result = await manager.removeRecords('proj', 'acme-zone-a-www', [
      criterion('www', '10.0.0.1'),
      criterion('www.', '10.0.0.1'),
    ]);

    expect(result.removed).toBe(1);
    expect((update.mock.calls[0][2] as { records: unknown[] }).records).toHaveLength(2);
  });
});
