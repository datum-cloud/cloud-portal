import { toComputeWorkloadPresence } from './compute-workload.queries';
import type { ComDatumapisComputeV1AlphaWorkload } from '@/modules/control-plane/compute';
import { describe, expect, it } from 'bun:test';

/** Only metadata matters here; the generated type also demands a spec. */
function workload(metadata: ComDatumapisComputeV1AlphaWorkload['metadata']) {
  return { metadata } as ComDatumapisComputeV1AlphaWorkload;
}

describe('toComputeWorkloadPresence', () => {
  it('treats a 404 as missing', () => {
    expect(toComputeWorkloadPresence({ state: 'absent', data: null })).toBe('missing');
  });

  it('treats a terminating workload as missing', () => {
    expect(
      toComputeWorkloadPresence({
        state: 'ok',
        data: workload({ name: 'web', deletionTimestamp: new Date('2026-09-24T10:00:00Z') }),
      })
    ).toBe('missing');
  });

  it('treats a readable workload as present', () => {
    expect(toComputeWorkloadPresence({ state: 'ok', data: workload({ name: 'web' }) })).toBe(
      'present'
    );
  });

  it("can't tell on 403 or other errors", () => {
    expect(toComputeWorkloadPresence({ state: 'forbidden', data: null })).toBe('unknown');
    expect(
      toComputeWorkloadPresence({ state: 'error', data: null, error: new Error('boom') })
    ).toBe('unknown');
  });
});
