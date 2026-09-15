import {
  type TrafficClass,
  resolveRouteGroup,
  resolveTrafficClass,
  stripApiPrefix,
} from './traffic-class';
import { describe, expect, test } from 'bun:test';

describe('resolveTrafficClass', () => {
  test.each<[string, TrafficClass]>([
    ['/api/watch/subscribe', 'machine'],
    ['/watch/stream?cid=abc', 'machine'],
    ['/api/prometheus', 'machine'],
    ['/api/grafana/query', 'machine'],
    ['/api/permissions/bulk-check', 'machine'],
    [
      '/api/proxy/apis/resourcemanager.miloapis.com/v1alpha1/projects/p1/control-plane/apis/o11y.miloapis.com/v1alpha1/logs/loki/api/v1/query_range',
      'machine',
    ],
    ['/api/proxy/apis/networking.miloapis.com/v1alpha1/namespaces/default/domains', 'interactive'],
    ['/api/usage?orgId=o1', 'interactive'],
    ['/api/graphql/org/o1', 'interactive'],
    ['/api/assistant-chat', 'interactive'],
    ['/api', 'interactive'],
    ['', 'interactive'],
  ])('%s -> %s', (path, expected) => {
    expect(resolveTrafficClass(path)).toBe(expected);
  });
});

describe('resolveRouteGroup', () => {
  test.each([
    ['/api/proxy/apis/x', 'proxy'],
    ['/permissions/check', 'permissions'],
    ['/api/usage?orgId=o1', 'usage'],
    ['/api/', 'unknown'],
    ['/apixyz/thing', 'apixyz'],
  ])('%s -> %s', (path, expected) => {
    expect(resolveRouteGroup(path)).toBe(expected);
  });
});

describe('stripApiPrefix', () => {
  test('removes only a leading /api segment', () => {
    expect(stripApiPrefix('/api/watch')).toBe('/watch');
    expect(stripApiPrefix('/watch')).toBe('/watch');
    expect(stripApiPrefix('/apixyz')).toBe('/apixyz');
    expect(stripApiPrefix('/api')).toBe('/api');
  });
});
