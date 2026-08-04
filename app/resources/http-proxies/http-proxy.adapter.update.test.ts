import {
  httpProxyPatchTouchesResource,
  toUpdateHttpProxyPayload,
} from './http-proxy.adapter';
import { describe, expect, it } from 'bun:test';

describe('toUpdateHttpProxyPayload', () => {
  it('omits metadata and spec for protection-only updates', () => {
    const payload = toUpdateHttpProxyPayload({
      trafficProtectionMode: 'Enforce',
      paranoiaLevels: { blocking: 2, detection: 2 },
    });

    expect(payload).toEqual({
      kind: 'HTTPProxy',
      apiVersion: 'networking.datumapis.com/v1alpha',
    });
    expect(httpProxyPatchTouchesResource(payload)).toBe(false);
  });

  it('includes spec when hostnames change', () => {
    const payload = toUpdateHttpProxyPayload({ hostnames: ['app.example.com'] });
    expect(httpProxyPatchTouchesResource(payload)).toBe(true);
    expect(payload.spec?.hostnames).toEqual(['app.example.com']);
  });
});
