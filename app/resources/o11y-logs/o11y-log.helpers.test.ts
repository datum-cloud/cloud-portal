/// <reference types="bun-types/test" />
import {
  albLogFacets,
  albLogMatchers,
  albRouteNameRegexp,
  buildAlbLogQL,
  filterAlbLogsByHost,
} from './o11y-log.helpers';
import type { LogEntry } from '@datum-cloud/datum-ui/logs';
import { describe, expect, it } from 'bun:test';

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
    ).toEqual(['app.example.com', 'origin.internal']);
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

  it('keeps rows whose inbound or rewritten host matches', () => {
    expect(filterAlbLogsByHost(entries, { host: ['app.example.com'] }).map((e) => e.id)).toEqual([
      '1',
    ]);
    expect(filterAlbLogsByHost(entries, { host: ['origin.internal'] }).map((e) => e.id)).toEqual([
      '1',
    ]);
  });
});
