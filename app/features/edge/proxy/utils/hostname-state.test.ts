import { buildHostnameState } from './hostname-state';
import type { HostnameStatusLike } from '@/resources/http-proxies';
import { describe, expect, test } from 'bun:test';

const routing = (state: 'Present' | 'Missing', managedBy = 'User') => ({
  name: 'app.example.com',
  type: 'CNAME',
  content: 'alb.datumproxy.net',
  purpose: 'Routing',
  managedBy,
  state,
});

// What the operator reports for a hostname whose DNS runs elsewhere: claimed,
// a routing record for the user to publish, and no DNSRecordProgrammed.
const externalStatus = (state: 'Present' | 'Missing'): HostnameStatusLike => ({
  hostname: 'app.example.com',
  conditions: [{ type: 'Available', status: 'True', reason: 'Claimed', message: '' }],
  dnsRecords: [routing(state)],
});

const build = (
  hostnameStatus: HostnameStatusLike,
  options: { inDatumZone?: boolean; zonesLoaded?: boolean } = {}
) =>
  buildHostnameState({
    hostname: 'app.example.com',
    hostnameStatus,
    inDatumZone: options.inDatumZone ?? false,
    zonesLoaded: options.zonesLoaded ?? true,
    zoneRecords: [],
  });

describe('buildHostnameState: DNS run outside Datum', () => {
  test('with no DNS condition and no Datum zone, it is external with the user routing record', () => {
    const state = build(externalStatus('Present'));
    expect(state.dns).toBe('not-applicable');
    expect(state.externalRouting?.state).toBe('Present');
  });

  test('a routing record not seen yet is carried as missing', () => {
    expect(build(externalStatus('Missing')).externalRouting?.state).toBe('Missing');
  });

  test('stays pending until the zone list has loaded', () => {
    const state = build(externalStatus('Present'), { zonesLoaded: false });
    expect(state.dns).toBe('pending');
    expect(state.externalRouting).toBeUndefined();
  });

  test('in a Datum zone, a missing condition still means Datum has yet to write the record', () => {
    const state = build(externalStatus('Missing'), { inDatumZone: true });
    expect(state.dns).toBe('pending');
    expect(state.externalRouting).toBeUndefined();
  });

  test('the operator NotApplicable reason reads as external too', () => {
    const state = build(
      {
        ...externalStatus('Present'),
        conditions: [
          { type: 'DNSRecordProgrammed', status: 'True', reason: 'NotApplicable', message: '' },
        ],
      },
      { zonesLoaded: false }
    );
    expect(state.dns).toBe('not-applicable');
    expect(state.externalRouting?.state).toBe('Present');
  });

  test('a record Datum programmed has no external routing', () => {
    const state = build({
      hostname: 'app.example.com',
      conditions: [
        { type: 'DNSRecordProgrammed', status: 'True', reason: 'RecordCreated', message: '' },
      ],
      dnsRecords: [routing('Present', 'Platform')],
    });
    expect(state.dns).toBe('programmed');
    expect(state.externalRouting).toBeUndefined();
  });
});
