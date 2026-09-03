import {
  humanizeServiceGroup,
  resolveMeterGroup,
  serviceDomainFromMeterName,
} from './usage-groups';
import { describe, expect, it } from 'bun:test';

describe('serviceDomainFromMeterName', () => {
  it('keeps the reverse-DNS prefix before the first slash', () => {
    expect(serviceDomainFromMeterName('dns.networking.miloapis.com/zone/queries')).toBe(
      'dns.networking.miloapis.com'
    );
  });

  it('returns the whole name when there is no slash', () => {
    expect(serviceDomainFromMeterName('dns.networking.miloapis.com')).toBe(
      'dns.networking.miloapis.com'
    );
  });
});

describe('resolveMeterGroup', () => {
  it('uses the catalog display name for DNS', () => {
    expect(resolveMeterGroup('dns.networking.miloapis.com/zone/queries')).toEqual({
      id: 'dns.networking.miloapis.com',
      title: 'DNS',
    });
  });

  it('uses the catalog display name for Networking', () => {
    expect(resolveMeterGroup('networking.datumapis.com/gateway/requests')).toEqual({
      id: 'networking.datumapis.com',
      title: 'Networking',
    });
  });

  it('title-cases the first label when the service is not in the catalog', () => {
    expect(resolveMeterGroup('assistant.miloapis.com/conversation/input-tokens')).toEqual({
      id: 'assistant.miloapis.com',
      title: 'Assistant',
    });
  });
});

describe('humanizeServiceGroup', () => {
  it('title-cases hyphenated first labels', () => {
    expect(humanizeServiceGroup('ai-gateway.example.com')).toBe('Ai Gateway');
  });
});
