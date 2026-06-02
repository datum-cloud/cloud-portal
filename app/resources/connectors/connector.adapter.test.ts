import { toConnector, toConnectorList } from './connector.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toConnector', () => {
  it('maps spec fields and device annotations, coercing createdAt to a Date', () => {
    const raw = {
      metadata: rawMetadata({
        uid: 'c-1',
        name: 'edge-1',
        namespace: 'proj-1',
        resourceVersion: '4',
        annotations: { 'datum.net/device-name': 'router-a', 'datum.net/device-os': 'linux' },
      }),
      spec: { connectorClassName: 'datum-edge', capabilities: ['vpn', 'dns'] },
      status: { phase: 'Connected' },
    };
    const connector = toConnector(raw as never);

    expect(connector.uid).toBe('c-1');
    expect(connector.name).toBe('edge-1');
    expect(connector.connectorClassName).toBe('datum-edge');
    // capabilities/status are strongly typed on Connector; the adapter passes
    // them through verbatim, so assert the raw passthrough via `unknown`.
    expect(connector.capabilities as unknown).toEqual(['vpn', 'dns']);
    expect(connector.deviceName).toBe('router-a');
    expect(connector.deviceOs).toBe('linux');
    expect(connector.status as unknown).toEqual({ phase: 'Connected' });
    expect(connector.createdAt).toBeInstanceOf(Date);
    expect((connector.createdAt as Date).toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('leaves device fields undefined when annotations are absent', () => {
    const raw = { metadata: rawMetadata({ annotations: {} }), spec: { connectorClassName: 'x' } };
    const connector = toConnector(raw as never);
    expect(connector.deviceName).toBeUndefined();
    expect(connector.deviceOs).toBeUndefined();
  });
});

describe('toConnectorList', () => {
  it('maps items and surfaces pagination', () => {
    const list = toConnectorList(
      [{ metadata: rawMetadata({ uid: 'a' }), spec: { connectorClassName: 'x' } }] as never,
      'tok'
    );
    expect(list.items[0].uid).toBe('a');
    expect(list.nextCursor).toBe('tok');
    expect(list.hasMore).toBe(true);
  });
});
