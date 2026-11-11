import {
  albFacetCountable,
  albFacetCounts,
  albLogFacets,
  albLogFacetsFromLabelValues,
  albLogMatchers,
  albRouteNameRegexp,
  buildAlbFacetCountQuery,
  buildAlbLogQL,
  filterAlbLogsByHost,
} from './o11y-log.helpers';
import type { LogEntry } from '@datum-cloud/datum-ui/logs';
import { describe, expect, it } from 'vitest';

describe('albLogMatchers', () => {
  it('drops identity labels so the explorer cannot escape the ALB', () => {
    expect(albLogMatchers('gw-1')).toEqual({});
    expect(
      albLogMatchers('gw-1', {
        resource_name: ['other'],
        route_name: ['httproute/ns/other/rule/0/match/0'],
        host: ['app.example.com'],
        authority: ['origin.internal'],
        method: ['GET'],
      })
    ).toEqual({
      method: ['GET'],
    });
  });
});

describe('buildAlbLogQL', () => {
  it('selects one ALB by Envoy route_name, not resource_name', () => {
    expect(buildAlbLogQL('gw-1')).toBe('{route_name=~"httproute/[^/]+/gw-1/.*"}');
    expect(albRouteNameRegexp('gw-1')).toBe('httproute/[^/]+/gw-1/.*');
  });

  it('merges extra label matchers into the stream selector', () => {
    expect(buildAlbLogQL('gw-1', { method: ['GET'] })).toBe(
      '{route_name=~"httproute/[^/]+/gw-1/.*", method="GET"}'
    );
    expect(buildAlbLogQL('gw-1', { response_code: ['200', '304'] })).toBe(
      '{route_name=~"httproute/[^/]+/gw-1/.*", response_code=~"200|304"}'
    );
  });

  it('escapes regex metacharacters and quotes in the ALB name', () => {
    expect(buildAlbLogQL('gw"1')).toBe('{route_name=~"httproute/[^/]+/gw\\"1/.*"}');
    expect(buildAlbLogQL('gw.1')).toBe('{route_name=~"httproute/[^/]+/gw\\\\.1/.*"}');
  });
});

describe('albLogFacets', () => {
  it('builds Method, Status code, and Host groups from access-log labels', () => {
    const facets = albLogFacets([
      {
        id: '1',
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
        timestampNs: '1',
        line: 'GET /healthz 200 12ms',
        labels: {
          method: 'GET',
          response_code: '200',
          authority: 'origin.internal',
          requested_server_name: 'app.example.com',
          severity: 'INFO',
        },
      },
    ]);

    expect(facets.map((facet) => facet.label)).toEqual(['Method', 'Status code', 'Host']);
    expect(facets.find((facet) => facet.name === 'severity')).toBeUndefined();
    expect(
      facets.find((facet) => facet.name === 'host')?.options.map((option) => option.value)
    ).toEqual(['app.example.com']);
  });
});

describe('filterAlbLogsByHost', () => {
  const entries: LogEntry[] = [
    {
      id: '1',
      timestamp: new Date('2024-01-01T00:00:00.000Z'),
      timestampNs: '1',
      line: 'GET / 200 1ms',
      labels: { authority: 'origin.internal', requested_server_name: 'app.example.com' },
    },
    {
      id: '2',
      timestamp: new Date('2024-01-01T00:00:01.000Z'),
      timestampNs: '2',
      line: 'GET /other 200 1ms',
      labels: { authority: 'other.example.com' },
    },
  ];

  it('matches the host each row shows, not the rewritten authority', () => {
    expect(filterAlbLogsByHost(entries, { host: ['app.example.com'] }).map((e) => e.id)).toEqual([
      '1',
    ]);
    expect(filterAlbLogsByHost(entries, { host: ['origin.internal'] })).toEqual([]);
    // With no other host label, authority is the row's host.
    expect(filterAlbLogsByHost(entries, { host: ['other.example.com'] }).map((e) => e.id)).toEqual([
      '2',
    ]);
  });
});

describe('albLogFacetsFromLabelValues', () => {
  it('lists every value, uncounted, in facet order', () => {
    expect(
      albLogFacetsFromLabelValues({
        method: ['POST', 'GET'],
        response_code: ['401', '200', '0', '503'],
        host: ['a.example.com'],
        requested_server_name: ['b.example.com', 'a.example.com'],
        x_forwarded_host: ['-'],
        authority: [' c.example.com '],
      })
    ).toEqual([
      { name: 'method', label: 'Method', options: [{ value: 'GET' }, { value: 'POST' }] },
      {
        name: 'response_code',
        label: 'Status code',
        options: [{ value: '0' }, { value: '200' }, { value: '401' }, { value: '503' }],
      },
      {
        name: 'host',
        label: 'Host',
        // Rewritten authorities and forwarded hosts aren't listed.
        options: [{ value: 'a.example.com' }, { value: 'b.example.com' }],
      },
    ]);
  });

  it('leaves out facets with no values', () => {
    expect(albLogFacetsFromLabelValues({ method: ['GET'] }).map((facet) => facet.name)).toEqual([
      'method',
    ]);
  });
});

describe('buildAlbFacetCountQuery', () => {
  it('counts one facet with the other facets applied, not its own', () => {
    expect(
      buildAlbFacetCountQuery('gw-1', 'method', { method: ['GET'], response_code: ['503'] }, 1800)
    ).toBe(
      'sum by (method) (count_over_time({route_name=~"httproute/[^/]+/gw-1/.*", response_code="503"} [1800s]))'
    );
  });

  it('groups Host by every label it is resolved from and leaves hosts out of LogQL', () => {
    expect(buildAlbFacetCountQuery('gw-1', 'host', { host: ['a.example.com'] }, 299.4)).toBe(
      'sum by (host, requested_server_name, x_forwarded_host, authority) (count_over_time({route_name=~"httproute/[^/]+/gw-1/.*"} [300s]))'
    );
  });
});

describe('albFacetCountable', () => {
  it('counts every facet with no search or host filter', () => {
    expect(albFacetCountable('method', { method: ['GET'] }, '')).toBe(true);
    expect(albFacetCountable('host', {}, '')).toBe(true);
  });

  it('skips counts the server cannot match to the table', () => {
    expect(albFacetCountable('method', {}, 'timeout')).toBe(false);
    expect(albFacetCountable('host', {}, ' x ')).toBe(false);
    expect(albFacetCountable('response_code', { host: ['a.example.com'] }, '')).toBe(false);
    // Host's own filter is left out of its count, so it stays countable.
    expect(albFacetCountable('host', { host: ['a.example.com'] }, '')).toBe(true);
  });
});

describe('albFacetCounts', () => {
  it('sums groups per value and skips Envoy placeholders', () => {
    const counts = albFacetCounts('method', [
      { labels: { method: 'GET' }, count: 4 },
      { labels: { method: 'POST' }, count: 1 },
      { labels: { method: '-' }, count: 9 },
      { labels: {}, count: 2 },
    ]);
    expect(Object.fromEntries(counts)).toEqual({ GET: 4, POST: 1 });
  });

  it('counts each line under the host its row shows', () => {
    const counts = albFacetCounts('host', [
      { labels: { host: 'a.example.com', authority: 'httpbin.org' }, count: 3 },
      { labels: { host: '-', requested_server_name: 'b.example.com' }, count: 2 },
      { labels: { authority: 'c.example.com' }, count: 1 },
      { labels: { requested_server_name: '-' }, count: 5 },
    ]);
    expect(Object.fromEntries(counts)).toEqual({
      'a.example.com': 3,
      'b.example.com': 2,
      'c.example.com': 1,
    });
  });

  it('lists only counted hosts and Host headers once counts are in', () => {
    const [facet] = albLogFacetsFromLabelValues(
      { host: ['a.example.com'], requested_server_name: ['sni.example.com'] },
      { host: new Map([['a.example.com', 9]]) }
    );
    expect(facet?.options).toEqual([{ value: 'a.example.com', count: 9 }]);
  });
});

describe('albLogFacetsFromLabelValues with counts', () => {
  it('gives every option of a counted facet a count, 0 when nothing matched', () => {
    const facets = albLogFacetsFromLabelValues(
      { method: ['GET', 'POST'], response_code: ['200'] },
      { method: new Map([['GET', 7]]) }
    );
    expect(facets).toEqual([
      {
        name: 'method',
        label: 'Method',
        options: [
          { value: 'GET', count: 7 },
          { value: 'POST', count: 0 },
        ],
      },
      { name: 'response_code', label: 'Status code', options: [{ value: '200' }] },
    ]);
  });

  it('lists a counted value the label values missed', () => {
    const [facet] = albLogFacetsFromLabelValues(
      { method: ['GET'] },
      { method: new Map([['PUT', 1]]) }
    );
    expect(facet?.options.map((option) => option.value)).toEqual(['GET', 'PUT']);
  });
});
