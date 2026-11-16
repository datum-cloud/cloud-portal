import { DnsRecordManager, DuplicateRecordError } from './dns-record.manager';
import type { CreateDnsRecordSchema, DnsRecordSet } from './dns-record.schema';
import type { DnsRecordService } from './dns-record.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/logger', () => ({
  logger: {
    debug: vi.fn(() => {}),
    info: vi.fn(() => {}),
    warn: vi.fn(() => {}),
    error: vi.fn(() => {}),
    request: vi.fn(() => {}),
    api: vi.fn(() => {}),
    service: vi.fn(() => {}),
  },
}));

function recordSet(partial: {
  name: string;
  recordType: string;
  records: DnsRecordSet['records'];
}): DnsRecordSet {
  return {
    uid: partial.name,
    name: partial.name,
    namespace: 'default',
    resourceVersion: '1',
    createdAt: new Date('2026-01-01'),
    dnsZoneId: 'acme-zone',
    recordType: partial.recordType,
    records: partial.records,
  };
}

function txtForm(name: string, content: string): CreateDnsRecordSchema {
  return {
    recordType: 'TXT',
    name,
    ttl: null,
    txt: { content },
  };
}

function stubService(overrides: Partial<DnsRecordService> = {}): DnsRecordService & {
  listByTypeAndZone: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
} {
  const listByTypeAndZone = vi.fn(async () => [] as DnsRecordSet[]);
  const update = vi.fn(async (_projectId: string, name: string, input: { records: unknown[] }) =>
    recordSet({ name, recordType: 'TXT', records: input.records as DnsRecordSet['records'] })
  );
  const create = vi.fn(
    async (_projectId: string, input: { recordType: string; records: unknown[] }) =>
      recordSet({
        name: `created-${input.recordType}`,
        recordType: input.recordType,
        records: input.records as DnsRecordSet['records'],
      })
  );

  return {
    list: vi.fn(),
    fetchList: vi.fn(),
    listRaw: vi.fn(),
    get: vi.fn(),
    fetchOne: vi.fn(),
    delete: vi.fn(),
    getStatus: vi.fn(),
    create,
    update,
    listByTypeAndZone,
    ...overrides,
  } as DnsRecordService & {
    listByTypeAndZone: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
}

const wwwTxt = recordSet({
  name: 'acme-zone-txt-www',
  recordType: 'TXT',
  records: [{ name: 'www', txt: { content: 'www-verify' } }],
});

const apexTxt = recordSet({
  name: 'acme-zone-txt-apex',
  recordType: 'TXT',
  records: [
    { name: '@', txt: { content: 'existing-1' } },
    { name: '@', txt: { content: 'existing-2' } },
  ],
});

describe('DnsRecordManager.addRecord', () => {
  let service: ReturnType<typeof stubService>;
  let manager: DnsRecordManager;

  beforeEach(() => {
    service = stubService();
    manager = new DnsRecordManager(service);
  });

  it('appends to the RecordSet that owns the target name, not items[0]', async () => {
    service.listByTypeAndZone.mockResolvedValue([wwwTxt, apexTxt]);

    const result = await manager.addRecord('proj', 'acme-zone', txtForm('@', 'new-verify'));

    expect(result.action).toBe('appended');
    expect(service.create).not.toHaveBeenCalled();
    expect(service.update).toHaveBeenCalledTimes(1);
    const [, recordSetName, input] = service.update.mock.calls[0];
    expect(recordSetName).toBe('acme-zone-txt-apex');
    expect(input.records).toHaveLength(3);
    expect(input.records[2]).toMatchObject({ name: '@', txt: { content: 'new-verify' } });
  });

  it('creates a new RecordSet when no existing set owns the name', async () => {
    service.listByTypeAndZone.mockResolvedValue([wwwTxt]);

    const result = await manager.addRecord('proj', 'acme-zone', txtForm('@', 'apex-verify'));

    expect(result.action).toBe('created');
    expect(service.update).not.toHaveBeenCalled();
    expect(service.create).toHaveBeenCalledTimes(1);
    const [, input] = service.create.mock.calls[0];
    expect(input.recordType).toBe('TXT');
    expect(input.records).toEqual([
      expect.objectContaining({ name: '@', txt: { content: 'apex-verify' } }),
    ]);
  });

  it('treats empty and @ as the same owner name', async () => {
    const apexEmptyName = recordSet({
      name: 'acme-zone-txt-apex',
      recordType: 'TXT',
      records: [{ name: '', txt: { content: 'existing' } }],
    });
    service.listByTypeAndZone.mockResolvedValue([wwwTxt, apexEmptyName]);

    const result = await manager.addRecord('proj', 'acme-zone', txtForm('@', 'another'));

    expect(result.action).toBe('appended');
    const [, recordSetName] = service.update.mock.calls[0];
    expect(recordSetName).toBe('acme-zone-txt-apex');
  });

  it('rejects an exact duplicate on the owning RecordSet', async () => {
    service.listByTypeAndZone.mockResolvedValue([wwwTxt, apexTxt]);

    await expect(
      manager.addRecord('proj', 'acme-zone', txtForm('@', 'existing-1'))
    ).rejects.toBeInstanceOf(DuplicateRecordError);
    expect(service.update).not.toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });
});

describe('DnsRecordManager.bulkImport', () => {
  it('resolves each (type, name) group independently', async () => {
    const service = stubService();
    service.listByTypeAndZone.mockImplementation(async (_projectId, _zoneId, _type) => [
      wwwTxt,
      apexTxt,
    ]);
    const manager = new DnsRecordManager(service);

    const result = await manager.bulkImport('proj', 'acme-zone', [
      {
        recordType: 'TXT',
        records: [
          { name: '@', txt: { content: 'apex-new' } },
          { name: 'www', txt: { content: 'www-new' } },
        ],
      } as never,
    ]);

    expect(result.summary.failed).toBe(0);
    expect(result.summary.updated).toBe(2);
    expect(service.update).toHaveBeenCalledTimes(2);
    const updatedNames = service.update.mock.calls.map((call) => call[1]).sort();
    expect(updatedNames).toEqual(['acme-zone-txt-apex', 'acme-zone-txt-www']);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('creates a RecordSet for an unowned name without appending to another of the same type', async () => {
    const service = stubService();
    service.listByTypeAndZone.mockResolvedValue([wwwTxt]);
    const manager = new DnsRecordManager(service);

    const result = await manager.bulkImport('proj', 'acme-zone', [
      {
        recordType: 'TXT',
        records: [{ name: '@', txt: { content: 'apex-new' } }],
      } as never,
    ]);

    expect(result.summary.created).toBe(1);
    expect(service.update).not.toHaveBeenCalled();
    expect(service.create).toHaveBeenCalledTimes(1);
    const [, input] = service.create.mock.calls[0];
    expect(input.records).toEqual([
      expect.objectContaining({ name: '@', txt: { content: 'apex-new' } }),
    ]);
  });
  describe('append strategy', () => {
    it('skips records the RecordSet already holds and leaves it untouched', async () => {
      const service = stubService();
      service.listByTypeAndZone.mockResolvedValue([apexTxt]);
      const manager = new DnsRecordManager(service);

      const result = await manager.bulkImport('proj', 'acme-zone', [
        {
          recordType: 'TXT',
          records: [
            { name: '@', txt: { content: 'existing-1' } },
            { name: '', txt: { content: 'existing-2' } },
          ],
        } as never,
      ]);

      expect(result.summary).toMatchObject({ created: 0, updated: 0, skipped: 2, failed: 0 });
      expect(result.details.map((detail) => detail.action)).toEqual(['skipped', 'skipped']);
      expect(service.update).not.toHaveBeenCalled();
      expect(service.create).not.toHaveBeenCalled();
    });

    it('appends only the new records after the existing ones', async () => {
      const service = stubService();
      service.listByTypeAndZone.mockResolvedValue([apexTxt]);
      const manager = new DnsRecordManager(service);

      const result = await manager.bulkImport('proj', 'acme-zone', [
        {
          recordType: 'TXT',
          records: [
            { name: '@', txt: { content: 'existing-1' } },
            { name: '@', txt: { content: 'apex-new' } },
          ],
        } as never,
      ]);

      expect(result.summary).toMatchObject({ created: 0, updated: 1, skipped: 1, failed: 0 });
      const [, recordSetName, input] = service.update.mock.calls[0];
      expect(recordSetName).toBe('acme-zone-txt-apex');
      expect(input.records).toEqual([
        { name: '@', txt: { content: 'existing-1' } },
        { name: '@', txt: { content: 'existing-2' } },
        { name: '@', txt: { content: 'apex-new' } },
      ]);
    });

    it('skips a record repeated inside the incoming batch', async () => {
      const service = stubService();
      const manager = new DnsRecordManager(service);

      const result = await manager.bulkImport('proj', 'acme-zone', [
        {
          recordType: 'CNAME',
          records: [
            { name: 'www', cname: { content: 'example.com.' } },
            { name: 'www', cname: { content: 'example.com' } },
          ],
        } as never,
      ]);

      expect(result.summary).toMatchObject({ created: 1, updated: 0, skipped: 1, failed: 0 });
      const [, input] = service.create.mock.calls[0];
      expect(input.records).toEqual([{ name: 'www', cname: { content: 'example.com.' } }]);
    });

    it('keeps duplicates when skipDuplicates is off', async () => {
      const service = stubService();
      service.listByTypeAndZone.mockResolvedValue([wwwTxt]);
      const manager = new DnsRecordManager(service);

      const result = await manager.bulkImport(
        'proj',
        'acme-zone',
        [
          {
            recordType: 'TXT',
            records: [{ name: 'www', txt: { content: 'www-verify' } }],
          } as never,
        ],
        { skipDuplicates: false }
      );

      expect(result.summary).toMatchObject({ updated: 1, skipped: 0 });
      const [, , input] = service.update.mock.calls[0];
      expect(input.records).toEqual([
        { name: 'www', txt: { content: 'www-verify' } },
        { name: 'www', txt: { content: 'www-verify' } },
      ]);
    });
  });

  describe('replace strategy', () => {
    it('swaps the records at the owner name and keeps other names on the RecordSet', async () => {
      const service = stubService();
      service.listByTypeAndZone.mockResolvedValue([
        recordSet({
          name: 'acme-zone-txt-shared',
          recordType: 'TXT',
          records: [
            { name: '@', txt: { content: 'apex-old-1' } },
            { name: 'www', txt: { content: 'www-keep' } },
            { name: '@', txt: { content: 'apex-old-2' } },
          ],
        }),
      ]);
      const manager = new DnsRecordManager(service);

      const result = await manager.bulkImport(
        'proj',
        'acme-zone',
        [{ recordType: 'TXT', records: [{ name: '@', txt: { content: 'apex-new' } }] } as never],
        { mergeStrategy: 'replace' }
      );

      expect(result.summary).toMatchObject({ created: 0, updated: 1, skipped: 0, failed: 0 });
      expect(result.details[0]).toMatchObject({
        action: 'updated',
        message: 'Replaced existing record',
      });
      const [, recordSetName, input] = service.update.mock.calls[0];
      expect(recordSetName).toBe('acme-zone-txt-shared');
      expect(input.records).toEqual([
        { name: 'www', txt: { content: 'www-keep' } },
        { name: '@', txt: { content: 'apex-new' } },
      ]);
    });

    it('writes an identical record again instead of skipping it', async () => {
      const service = stubService();
      service.listByTypeAndZone.mockResolvedValue([wwwTxt]);
      const manager = new DnsRecordManager(service);

      const result = await manager.bulkImport(
        'proj',
        'acme-zone',
        [
          {
            recordType: 'TXT',
            records: [{ name: 'www', txt: { content: 'www-verify' } }],
          } as never,
        ],
        { mergeStrategy: 'replace' }
      );

      expect(result.summary).toMatchObject({ updated: 1, skipped: 0 });
      const [, , input] = service.update.mock.calls[0];
      expect(input.records).toEqual([{ name: 'www', txt: { content: 'www-verify' } }]);
    });

    it('creates the RecordSet when no existing set owns the name', async () => {
      const service = stubService();
      const manager = new DnsRecordManager(service);

      const result = await manager.bulkImport(
        'proj',
        'acme-zone',
        [{ recordType: 'TXT', records: [{ name: '@', txt: { content: 'apex-new' } }] } as never],
        { mergeStrategy: 'replace' }
      );

      expect(result.summary).toMatchObject({ created: 1, updated: 0 });
      expect(result.details[0]).toMatchObject({ action: 'created', message: 'Created new record' });
      expect(service.update).not.toHaveBeenCalled();
      expect(service.create).toHaveBeenCalledTimes(1);
    });
  });
});
