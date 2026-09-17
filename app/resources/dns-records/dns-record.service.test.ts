/// <reference types="bun-types/test" />
import {
  DNS_RECORD_MAX_PAGES,
  DNS_RECORD_PAGE_SIZE,
  createDnsRecordService,
} from './dns-record.service';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

const listSpy = mock();

// NOTE: `mock.module` in Bun is process-global and persists for the rest of
// the run, so it can leak into other test files. Keep these mocks faithful to
// the real modules' shape/output (e.g. the real scoped-base URL format, the
// full logger surface, and every SDK call the service imports) so execution
// order can never matter.
mock.module('@/modules/control-plane/dns-networking', () => ({
  listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet: (...args: unknown[]) =>
    listSpy(...args),
  readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet: mock(() => {}),
  createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet: mock(() => {}),
  patchDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet: mock(() => {}),
  deleteDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet: mock(() => {}),
  readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSetStatus: mock(() => {}),
}));

mock.module('@/resources/base/utils', () => ({
  getProjectScopedBase: (id: string) =>
    `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${id}/control-plane`,
}));

mock.module('@/utils/errors/error-mapper', () => ({
  mapApiError: (e: unknown) => e,
}));

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

const ZONE_ID = 'acme-zone';
const ZONE_FIELD_SELECTOR = `spec.dnsZoneRef.name=${ZONE_ID}`;

/** A single-record A RecordSet in the shape the control plane returns. */
function recordSet(name: string, recordName: string, content: string) {
  return {
    metadata: {
      uid: `uid-${name}`,
      name,
      namespace: 'default',
      resourceVersion: '1',
      creationTimestamp: '2026-01-01T00:00:00Z',
    },
    spec: {
      dnsZoneRef: { name: ZONE_ID },
      recordType: 'A',
      records: [{ name: recordName, ttl: 300, a: { content } }],
    },
  };
}

/** One list response; `continueToken` mirrors the API's `metadata.continue`. */
function page(items: ReturnType<typeof recordSet>[], continueToken?: string) {
  return {
    data: {
      items,
      metadata: continueToken ? { continue: continueToken } : {},
    },
  };
}

function queryOf(callIndex: number) {
  return listSpy.mock.calls[callIndex][0].query;
}

beforeEach(() => {
  listSpy.mockReset();
});

describe('dnsRecordService.list paging', () => {
  it('returns every record and reports truncated false when there is no continue token', async () => {
    listSpy.mockResolvedValueOnce(
      page([
        recordSet('zone-a-www', 'www', '192.0.2.1'),
        recordSet('zone-a-api', 'api', '192.0.2.2'),
      ])
    );

    const result = await createDnsRecordService().list('alpha', ZONE_ID);

    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(result.truncated).toBe(false);
    expect(result.records).toHaveLength(2);
    expect(listSpy.mock.calls[0][0].baseURL).toBe(
      '/apis/resourcemanager.miloapis.com/v1alpha1/projects/alpha/control-plane'
    );
  });

  it('follows the continue token so records past the first page are listed', async () => {
    listSpy
      .mockResolvedValueOnce(page([recordSet('zone-a-aaa', 'aaa', '192.0.2.1')], 'cursor-1'))
      .mockResolvedValueOnce(page([recordSet('zone-a-bbb', 'bbb', '192.0.2.2')]));

    const result = await createDnsRecordService().list('alpha', ZONE_ID);

    expect(listSpy).toHaveBeenCalledTimes(2);
    expect(result.truncated).toBe(false);
    expect(result.records.map((record) => record.name)).toEqual(['aaa', 'bbb']);
  });

  it('sends the previous page continue token on the next request', async () => {
    listSpy
      .mockResolvedValueOnce(page([recordSet('zone-a-one', 'one', '192.0.2.1')], 'cursor-1'))
      .mockResolvedValueOnce(page([recordSet('zone-a-two', 'two', '192.0.2.2')], 'cursor-2'))
      .mockResolvedValueOnce(page([recordSet('zone-a-three', 'three', '192.0.2.3')]));

    await createDnsRecordService().list('alpha', ZONE_ID);

    expect(listSpy).toHaveBeenCalledTimes(3);
    expect(queryOf(0).continue).toBeUndefined();
    expect(queryOf(1).continue).toBe('cursor-1');
    expect(queryOf(2).continue).toBe('cursor-2');
  });

  it('treats an empty continue token as the end of the zone', async () => {
    listSpy.mockResolvedValueOnce(page([recordSet('zone-a-www', 'www', '192.0.2.1')], ''));

    const result = await createDnsRecordService().list('alpha', ZONE_ID);

    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(result.truncated).toBe(false);
  });

  it('stops at the page ceiling and reports truncated when a token is still outstanding', async () => {
    listSpy.mockResolvedValue(page([recordSet('zone-a-www', 'www', '192.0.2.1')], 'cursor-next'));

    const result = await createDnsRecordService().list('alpha', ZONE_ID);

    expect(listSpy).toHaveBeenCalledTimes(DNS_RECORD_MAX_PAGES);
    expect(result.records).toHaveLength(DNS_RECORD_MAX_PAGES);
    expect(result.truncated).toBe(true);
  });

  it('sends the zone fieldSelector and the page limit on every page', async () => {
    listSpy
      .mockResolvedValueOnce(page([recordSet('zone-a-one', 'one', '192.0.2.1')], 'cursor-1'))
      .mockResolvedValueOnce(page([recordSet('zone-a-two', 'two', '192.0.2.2')], 'cursor-2'))
      .mockResolvedValueOnce(page([recordSet('zone-a-three', 'three', '192.0.2.3')]));

    await createDnsRecordService().list('alpha', ZONE_ID);

    expect(listSpy).toHaveBeenCalledTimes(3);
    for (let call = 0; call < 3; call++) {
      expect(queryOf(call).fieldSelector).toBe(ZONE_FIELD_SELECTOR);
      expect(queryOf(call).limit).toBe(DNS_RECORD_PAGE_SIZE);
    }
  });

  it('omits the fieldSelector when no zone is given', async () => {
    listSpy.mockResolvedValueOnce(page([recordSet('zone-a-www', 'www', '192.0.2.1')]));

    await createDnsRecordService().list('alpha');

    expect(queryOf(0).fieldSelector).toBeUndefined();
    expect(queryOf(0).limit).toBe(DNS_RECORD_PAGE_SIZE);
  });
});

describe('dnsRecordService.listRaw paging', () => {
  it('stitches pages in request order and reports no more pages', async () => {
    listSpy
      .mockResolvedValueOnce(page([recordSet('zone-a-zzz', 'zzz', '192.0.2.1')], 'cursor-1'))
      .mockResolvedValueOnce(page([recordSet('zone-a-aaa', 'aaa', '192.0.2.2')]));

    const result = await createDnsRecordService().listRaw('alpha', ZONE_ID);

    expect(listSpy).toHaveBeenCalledTimes(2);
    expect(result.items.map((item) => item.name)).toEqual(['zone-a-zzz', 'zone-a-aaa']);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('reports the outstanding cursor when the page ceiling stops the loop', async () => {
    listSpy.mockResolvedValue(page([recordSet('zone-a-www', 'www', '192.0.2.1')], 'cursor-next'));

    const result = await createDnsRecordService().listRaw('alpha', ZONE_ID);

    expect(listSpy).toHaveBeenCalledTimes(DNS_RECORD_MAX_PAGES);
    expect(result.items).toHaveLength(DNS_RECORD_MAX_PAGES);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('cursor-next');
  });
});
