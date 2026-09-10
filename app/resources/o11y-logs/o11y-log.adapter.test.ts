/// <reference types="bun-types/test" />
import { toLogEntries } from './o11y-log.adapter';
import type { LokiQueryRangeResponse } from '@datum-cloud/datum-ui/logs';
import { describe, expect, it } from 'bun:test';

describe('toLogEntries', () => {
  it('keeps the empty Body and the access-log attributes datum-ui parses', () => {
    const response: LokiQueryRangeResponse = {
      status: 'success',
      data: {
        resultType: 'streams',
        result: [
          {
            stream: {
              method: 'GET',
              path: '/healthz',
              response_code: '200',
              duration: '12',
              route_name: 'httproute/ns-proj/gw-1/rule/0/match/0',
            },
            values: [['1700000000000000000', '']],
          },
        ],
      },
    };

    const entries = toLogEntries(response);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.line).toBe('');
    expect(entries[0]?.labels).toEqual({
      method: 'GET',
      path: '/healthz',
      response_code: '200',
      duration: '12ms',
    });
  });

  it('drops collector and unused Envoy attributes from the label set', () => {
    const response: LokiQueryRangeResponse = {
      status: 'success',
      data: {
        resultType: 'streams',
        result: [
          {
            stream: {
              method: 'GET',
              path: '/',
              response_code: '200',
              duration: '4',
              authority: 'origin.internal',
              requested_server_name: 'app.example.com',
              referer: 'https://shop.example.com/cart',
              request_id: 'abc',
              'k8s.pod.name': 'envoy-xyz',
              'milo.project.id': 'proj-a',
              project_name: 'proj-a',
              route_name: 'httproute/ns/gw-1/rule/0/match/0',
              downstream_remote_address: '1.2.3.4:52344',
            },
            values: [['1700000000000000000', '']],
          },
        ],
      },
    };

    expect(toLogEntries(response)[0]?.labels).toEqual({
      host: 'app.example.com',
      method: 'GET',
      path: '/',
      response_code: '200',
      duration: '4ms',
      authority: 'origin.internal',
      requested_server_name: 'app.example.com',
      referer: 'https://shop.example.com/cart',
      request_id: 'abc',
    });
  });

  it('passes a text line through untouched', () => {
    const response: LokiQueryRangeResponse = {
      status: 'success',
      data: {
        resultType: 'streams',
        result: [
          {
            stream: { resource_name: 'gw-1' },
            values: [['1700000000000000000', 'GET /healthz 200 12ms upstream=gw-1']],
          },
        ],
      },
    };

    expect(toLogEntries(response)[0]?.line).toBe('GET /healthz 200 12ms upstream=gw-1');
  });

  it('does not double-suffix a duration that already has a unit', () => {
    const response: LokiQueryRangeResponse = {
      status: 'success',
      data: {
        resultType: 'streams',
        result: [
          {
            stream: { method: 'GET', path: '/', response_code: '200', duration: '12ms' },
            values: [['1700000000000000000', '']],
          },
        ],
      },
    };

    expect(toLogEntries(response)[0]?.labels.duration).toBe('12ms');
  });
});
