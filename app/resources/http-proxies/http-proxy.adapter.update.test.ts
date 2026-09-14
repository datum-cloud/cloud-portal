import {
  HSTS_HEADER,
  HSTS_HEADER_VALUE,
  classifyHttpProxyComplexity,
  extractHsts,
  extractUpdatedAt,
  httpProxyPatchTouchesResource,
  toHttpProxy,
  toUpdateHttpProxyPayload,
} from './http-proxy.adapter';
import type { HttpProxy } from './http-proxy.schema';
import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';
import { describe, expect, it } from 'bun:test';

const hostFilter = {
  type: 'RequestHeaderModifier' as const,
  requestHeaderModifier: { set: [{ name: 'Host', value: 'origin.internal' }] },
};
const hstsFilter = {
  type: 'ResponseHeaderModifier' as const,
  responseHeaderModifier: { set: [{ name: HSTS_HEADER, value: HSTS_HEADER_VALUE }] },
};

function rawProxy(
  filters?: NonNullable<
    NonNullable<ComDatumapisNetworkingV1AlphaHttpProxy['spec']>['rules']
  >[number]['filters']
): ComDatumapisNetworkingV1AlphaHttpProxy {
  return {
    metadata: { name: 'alb' },
    spec: {
      rules: [
        {
          backends: [{ endpoint: 'https://origin.example.com' }],
          ...(filters && { filters }),
        },
      ],
    },
  } as ComDatumapisNetworkingV1AlphaHttpProxy;
}

const currentProxy: HttpProxy = {
  uid: 'u',
  name: 'alb',
  resourceVersion: '1',
  createdAt: new Date(0),
  endpoint: 'https://origin.example.com',
  enableHttpRedirect: true,
  hsts: false,
};

describe('HSTS filter modelling', () => {
  it('reads Strict-Transport-Security on the backend rule as hsts=true', () => {
    expect(extractHsts(rawProxy([hstsFilter]))).toBe(true);
    expect(toHttpProxy(rawProxy([hstsFilter])).hsts).toBe(true);
    expect(toHttpProxy(rawProxy()).hsts).toBe(false);
  });

  it('matches the header name case-insensitively', () => {
    const lower = {
      type: 'ResponseHeaderModifier' as const,
      responseHeaderModifier: { set: [{ name: 'strict-transport-security', value: 'max-age=1' }] },
    };
    expect(extractHsts(rawProxy([lower]))).toBe(true);
  });

  it('keeps portal-managed Host + HSTS filters form-editable', () => {
    expect(classifyHttpProxyComplexity(rawProxy([hstsFilter]))).toBe('host-only');
    expect(classifyHttpProxyComplexity(rawProxy([hostFilter, hstsFilter]))).toBe('host-only');
  });

  it('treats other response headers or duplicates as advanced', () => {
    const other = {
      type: 'ResponseHeaderModifier' as const,
      responseHeaderModifier: { set: [{ name: 'X-Frame-Options', value: 'DENY' }] },
    };
    expect(classifyHttpProxyComplexity(rawProxy([other]))).toBe('advanced');
    expect(classifyHttpProxyComplexity(rawProxy([hstsFilter, hstsFilter]))).toBe('advanced');
  });

  it('writes the HSTS filter on the backend rule when enabling', () => {
    const payload = toUpdateHttpProxyPayload({ hsts: true }, currentProxy);
    const backendRule = payload.spec?.rules?.find((r) => 'backends' in r);
    expect(backendRule?.filters).toEqual([hstsFilter]);
  });

  it('preserves HSTS when another rules field changes', () => {
    const payload = toUpdateHttpProxyPayload(
      { hostHeader: 'origin.internal' },
      { ...currentProxy, hsts: true }
    );
    const backendRule = payload.spec?.rules?.find((r) => 'backends' in r);
    expect(backendRule?.filters).toEqual([hostFilter, hstsFilter]);
  });

  it('drops the HSTS filter when disabling', () => {
    const payload = toUpdateHttpProxyPayload({ hsts: false }, { ...currentProxy, hsts: true });
    const backendRule = payload.spec?.rules?.find((r) => 'backends' in r);
    expect(backendRule?.filters).toBeUndefined();
  });
});

describe('extractUpdatedAt', () => {
  const withManagedFields = (
    managedFields: NonNullable<ComDatumapisNetworkingV1AlphaHttpProxy['metadata']>['managedFields']
  ): ComDatumapisNetworkingV1AlphaHttpProxy =>
    ({ metadata: { name: 'alb', managedFields } }) as ComDatumapisNetworkingV1AlphaHttpProxy;

  it('picks the newest non-status write', () => {
    const raw = withManagedFields([
      { manager: 'portal', operation: 'Update', time: '2026-09-01T10:00:00Z' },
      { manager: 'portal', operation: 'Update', time: '2026-09-03T10:00:00Z' },
      {
        manager: 'operator',
        operation: 'Update',
        subresource: 'status',
        time: '2026-09-10T10:00:00Z',
      },
    ]);
    expect(extractUpdatedAt(raw)?.toISOString()).toBe('2026-09-03T10:00:00.000Z');
  });

  it('returns undefined without managedFields', () => {
    expect(extractUpdatedAt(withManagedFields(undefined))).toBeUndefined();
    expect(toHttpProxy(rawProxy()).updatedAt).toBeUndefined();
  });
});

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
