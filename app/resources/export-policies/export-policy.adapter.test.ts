import {
  toCreateExportPolicyPayload,
  toExportPolicy,
  toExportPolicyList,
  toUpdateExportPolicyPayload,
} from './export-policy.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toExportPolicy', () => {
  it('maps spec sources/sinks and defaults labels/annotations to empty objects', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'ep-1', name: 'policy-1', labels: { env: 'prod' } }),
      spec: { sources: [{ name: 's1' }], sinks: [{ name: 'k1' }] },
      status: { ready: true },
    };
    const policy = toExportPolicy(raw as never);

    expect(policy.uid).toBe('ep-1');
    expect(policy.sources).toEqual([{ name: 's1' }]);
    expect(policy.sinks).toEqual([{ name: 'k1' }]);
    expect(policy.labels).toEqual({ env: 'prod' });
    expect(policy.annotations).toEqual({});
  });
});

describe('toExportPolicyList', () => {
  it('maps items and surfaces pagination', () => {
    const list = toExportPolicyList([{ metadata: rawMetadata({ uid: 'a' }) }] as never, 'tok');
    expect(list.items[0].uid).toBe('a');
    expect(list.hasMore).toBe(true);
  });
});

describe('toCreateExportPolicyPayload', () => {
  it('maps sources to metricsql and builds a Prometheus sink with basic-auth + defaults', () => {
    const payload = toCreateExportPolicyPayload({
      metadata: { name: 'policy-1', labels: ['env:prod'], annotations: ['team:obs'] },
      sources: [{ name: 'cpu', metricQuery: 'rate(cpu[5m])' }],
      sinks: [
        {
          name: 'remote',
          type: 'Prometheus',
          sources: ['cpu', 'cpu', 'mem'],
          prometheusRemoteWrite: {
            endpoint: 'https://example/write',
            authentication: { authType: 'basic-auth', secretName: 'creds' },
          },
        },
      ],
    } as never);

    expect(payload.apiVersion).toBe('telemetry.miloapis.com/v1alpha1');
    expect(payload.metadata!.labels).toEqual({ env: 'prod' });
    expect(payload.metadata!.annotations).toEqual({ team: 'obs' });
    expect(payload.spec?.sources?.[0]).toEqual({
      name: 'cpu',
      metrics: { metricsql: 'rate(cpu[5m])' },
    });

    const sink = payload.spec!.sinks![0] as any;
    // sources are de-duplicated via a Set.
    expect(sink.sources).toEqual(['cpu', 'mem']);
    expect(sink.target.prometheusRemoteWrite.endpoint).toBe('https://example/write');
    // batch/retry defaults are stamped.
    expect(sink.target.prometheusRemoteWrite.batch).toEqual({ maxSize: 100, timeout: '5s' });
    expect(sink.target.prometheusRemoteWrite.retry).toEqual({
      backoffDuration: '5s',
      maxAttempts: 3,
    });
    expect(sink.target.prometheusRemoteWrite.authentication).toEqual({
      basicAuth: { secretRef: { name: 'creds' } },
    });
  });

  it('omits the authentication block when no authType is set', () => {
    const payload = toCreateExportPolicyPayload({
      metadata: { name: 'p' },
      sources: [],
      sinks: [
        { name: 'k', type: 'Prometheus', sources: [], prometheusRemoteWrite: { endpoint: 'e' } },
      ],
    } as never);
    const sink = payload.spec!.sinks![0] as any;
    expect(sink.target.prometheusRemoteWrite.authentication).toBeUndefined();
  });
});

describe('toUpdateExportPolicyPayload', () => {
  it('reuses the create payload and stamps the resourceVersion', () => {
    const payload = toUpdateExportPolicyPayload({
      metadata: { name: 'p' },
      sources: [],
      sinks: [],
      resourceVersion: '42',
    } as never);
    expect((payload.metadata as any).resourceVersion).toBe('42');
    expect(payload.metadata!.name).toBe('p');
  });
});
