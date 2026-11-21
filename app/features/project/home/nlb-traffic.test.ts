import {
  NETWORKING_PLUGIN_MANIFEST_NAME,
  findNetworkingPluginSlug,
  nlbListHref,
  projectNlbBytesQuery,
  projectNlbBytesRateQuery,
  projectNlbBytesSeenQuery,
  projectNlbCountQuery,
  projectNlbDroppedQuery,
  projectNlbDroppedRateQuery,
  projectNlbPacketsQuery,
  projectNlbPacketsRateQuery,
} from './nlb-traffic';
import type { PublicPlugin } from '@/modules/plugins/types';
import { describe, expect, it } from 'vitest';

const SELECTOR = '{resourcemanager_datumapis_com_project_name="demo",resource_namespace="default"}';

describe('NLB project queries', () => {
  it('counts the NLBs that recorded a listener in the window', () => {
    expect(projectNlbCountQuery('demo', '24h')).toBe(
      `count(count by (resource_name) (last_over_time(datum_nlb_listener_backends${SELECTOR}[24h])))`
    );
  });

  it('reads inbound bytes as a rate and a reset-guarded total', () => {
    expect(projectNlbBytesRateQuery('demo', '30m')).toBe(
      `sum(rate(datum_nlb_listener_receive_bytes_total${SELECTOR}[30m]))`
    );
    expect(projectNlbBytesQuery('demo', '24h')).toBe(
      `sum((increase(datum_nlb_listener_receive_bytes_total${SELECTOR}[24h]) * ` +
        `(resets(datum_nlb_listener_receive_bytes_total${SELECTOR}[24h]) == bool 0)))`
    );
  });

  it('checks for any inbound bytes without dropping series that reset', () => {
    expect(projectNlbBytesSeenQuery('demo', '24h')).toBe(
      `sum(increase(datum_nlb_listener_receive_bytes_total${SELECTOR}[24h]))`
    );
  });

  it('reads inbound packets and drops', () => {
    expect(projectNlbPacketsRateQuery('demo', '30m')).toContain(
      'datum_nlb_listener_receive_packets_total'
    );
    expect(projectNlbPacketsQuery('demo', '24h')).toContain(
      'increase(datum_nlb_listener_receive_packets_total'
    );
    expect(projectNlbDroppedRateQuery('demo', '30m')).toContain(
      'rate(datum_nlb_listener_receive_dropped_packets_total'
    );
    expect(projectNlbDroppedQuery('demo', '24h')).toContain(
      'increase(datum_nlb_listener_receive_dropped_packets_total'
    );
  });

  it('never reads outbound counters, which stay at 0 under direct server return', () => {
    const queries = [
      projectNlbCountQuery('demo', '24h'),
      projectNlbBytesRateQuery('demo', '30m'),
      projectNlbBytesQuery('demo', '24h'),
      projectNlbBytesSeenQuery('demo', '24h'),
      projectNlbPacketsRateQuery('demo', '30m'),
      projectNlbPacketsQuery('demo', '24h'),
      projectNlbDroppedRateQuery('demo', '30m'),
      projectNlbDroppedQuery('demo', '24h'),
    ];
    for (const query of queries) expect(query).not.toContain('transmit');
  });
});

describe('networking plugin links', () => {
  const plugin = (slug: string, name: string) =>
    ({ slug, manifest: { name } }) as unknown as PublicPlugin;

  it('finds the networking plugin by its manifest name', () => {
    expect(
      findNetworkingPluginSlug([
        plugin('compute', 'workload.compute.datumapis.com'),
        plugin('net', NETWORKING_PLUGIN_MANIFEST_NAME),
      ])
    ).toBe('net');
    expect(
      findNetworkingPluginSlug([plugin('compute', 'workload.compute.datumapis.com')])
    ).toBeUndefined();
    expect(findNetworkingPluginSlug(undefined)).toBeUndefined();
  });

  it('links to the NLB list under the plugin mount, or nowhere without one', () => {
    expect(nlbListHref('demo', 'net')).toBe('/project/demo/services/net/nlb');
    expect(nlbListHref('demo', undefined)).toBeUndefined();
  });
});
