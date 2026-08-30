import { amberfloMeterApiName } from './amberflo-meter-api-name';
import { describe, expect, it } from 'bun:test';

describe('amberfloMeterApiName', () => {
  it("passes through names that fit Amberflo's 50-character cap", () => {
    expect(amberfloMeterApiName('networking-datumapis-com-gateway-requests')).toBe(
      'networking-datumapis-com-gateway-requests'
    );
  });

  it('hashes names over 50 characters with SHA-1 hex', () => {
    expect(amberfloMeterApiName('assistant-miloapis-com-conversation-cache-read-tokens')).toBe(
      'c0c79b3abb6c6e7f19d74e87d782cbe7c93d790b'
    );
  });

  it('returns empty for missing names', () => {
    expect(amberfloMeterApiName('')).toBe('');
  });
});
