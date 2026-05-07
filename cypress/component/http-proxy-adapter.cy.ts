/**
 * Cypress component tests for http-proxy adapter — Host header override (feat-001).
 *
 * Tests cover:
 *  - classifyHttpProxyComplexity
 *  - validateHostHeader
 *  - extractHostHeader (read path)
 *  - toCreateHttpProxyPayload (write path)
 *  - toUpdateHttpProxyPayload (write path)
 *  - Round-trip parity
 */
import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';
import {
  classifyHttpProxyComplexity,
  validateHostHeader,
  extractHostHeader,
  toCreateHttpProxyPayload,
  toUpdateHttpProxyPayload,
  toHttpProxy,
} from '@/resources/http-proxies/http-proxy.adapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal raw HTTPProxy with a single backend rule */
function makeRaw(
  overrides: Partial<ComDatumapisNetworkingV1AlphaHttpProxy> = {}
): ComDatumapisNetworkingV1AlphaHttpProxy {
  return {
    apiVersion: 'networking.datumapis.com/v1alpha',
    kind: 'HTTPProxy',
    metadata: {
      name: 'test-proxy',
      uid: 'uid-1',
      resourceVersion: '1',
    },
    spec: {
      hostnames: ['test.example.com'],
      rules: [
        {
          backends: [{ endpoint: 'https://api.example.com' }],
        },
      ],
    },
    ...overrides,
  };
}

/** Build a raw HTTPProxy whose backend rule 0 has a Host filter */
function makeRawWithHostFilter(hostValue: string): ComDatumapisNetworkingV1AlphaHttpProxy {
  return makeRaw({
    spec: {
      hostnames: ['test.example.com'],
      rules: [
        {
          backends: [{ endpoint: 'https://api.example.com' }],
          filters: [
            {
              type: 'RequestHeaderModifier',
              requestHeaderModifier: {
                set: [{ name: 'Host', value: hostValue }],
              },
            },
          ],
        },
      ],
    },
  });
}

// ---------------------------------------------------------------------------
// classifyHttpProxyComplexity
// ---------------------------------------------------------------------------

describe('classifyHttpProxyComplexity', () => {
  it('returns simple when no backend rules exist', () => {
    const raw = makeRaw({ spec: { hostnames: [], rules: [] } });
    expect(classifyHttpProxyComplexity(raw)).to.equal('simple');
  });

  it('returns simple when backend rule has no filters', () => {
    const raw = makeRaw();
    expect(classifyHttpProxyComplexity(raw)).to.equal('simple');
  });

  it('returns simple when filters array is empty', () => {
    const raw = makeRaw({
      spec: {
        hostnames: [],
        rules: [{ backends: [{ endpoint: 'https://api.example.com' }], filters: [] }],
      },
    });
    expect(classifyHttpProxyComplexity(raw)).to.equal('simple');
  });

  it('returns host-only for a single Host filter', () => {
    const raw = makeRawWithHostFilter('example.internal');
    expect(classifyHttpProxyComplexity(raw)).to.equal('host-only');
  });

  it('returns host-only for a lowercase host name in the set entry', () => {
    const raw = makeRaw({
      spec: {
        hostnames: [],
        rules: [
          {
            backends: [{ endpoint: 'https://api.example.com' }],
            filters: [
              {
                type: 'RequestHeaderModifier' as const,
                requestHeaderModifier: {
                  set: [{ name: 'host', value: 'example.internal' }],
                },
              },
            ],
          },
        ],
      },
    });
    expect(classifyHttpProxyComplexity(raw)).to.equal('host-only');
  });

  it('returns advanced when there are multiple backend rules', () => {
    const raw = makeRaw({
      spec: {
        hostnames: [],
        rules: [
          { backends: [{ endpoint: 'https://api1.example.com' }] },
          { backends: [{ endpoint: 'https://api2.example.com' }] },
        ],
      },
    });
    expect(classifyHttpProxyComplexity(raw)).to.equal('advanced');
  });

  it('returns advanced when there are multiple rule-level filters', () => {
    const raw = makeRaw({
      spec: {
        hostnames: [],
        rules: [
          {
            backends: [{ endpoint: 'https://api.example.com' }],
            filters: [
              {
                type: 'RequestHeaderModifier' as const,
                requestHeaderModifier: { set: [{ name: 'Host', value: 'a.internal' }] },
              },
              {
                type: 'RequestHeaderModifier' as const,
                requestHeaderModifier: { set: [{ name: 'X-Custom', value: 'val' }] },
              },
            ],
          },
        ],
      },
    });
    expect(classifyHttpProxyComplexity(raw)).to.equal('advanced');
  });

  it('returns advanced when the filter is not a requestHeaderModifier', () => {
    const raw = makeRaw({
      spec: {
        hostnames: [],
        rules: [
          {
            backends: [{ endpoint: 'https://api.example.com' }],
            filters: [
              {
                requestRedirect: { scheme: 'https', statusCode: 301 },
              } as never,
            ],
          },
        ],
      },
    });
    expect(classifyHttpProxyComplexity(raw)).to.equal('advanced');
  });

  it('returns advanced when requestHeaderModifier sets a non-Host header', () => {
    const raw = makeRaw({
      spec: {
        hostnames: [],
        rules: [
          {
            backends: [{ endpoint: 'https://api.example.com' }],
            filters: [
              {
                type: 'RequestHeaderModifier' as const,
                requestHeaderModifier: {
                  set: [{ name: 'X-Custom-Header', value: 'value' }],
                },
              },
            ],
          },
        ],
      },
    });
    expect(classifyHttpProxyComplexity(raw)).to.equal('advanced');
  });

  it('returns advanced when requestHeaderModifier sets multiple headers', () => {
    const raw = makeRaw({
      spec: {
        hostnames: [],
        rules: [
          {
            backends: [{ endpoint: 'https://api.example.com' }],
            filters: [
              {
                type: 'RequestHeaderModifier' as const,
                requestHeaderModifier: {
                  set: [
                    { name: 'Host', value: 'a.internal' },
                    { name: 'X-Other', value: 'val' },
                  ],
                },
              },
            ],
          },
        ],
      },
    });
    expect(classifyHttpProxyComplexity(raw)).to.equal('advanced');
  });

  it('returns advanced when requestHeaderModifier also has add', () => {
    const raw = makeRaw({
      spec: {
        hostnames: [],
        rules: [
          {
            backends: [{ endpoint: 'https://api.example.com' }],
            filters: [
              {
                type: 'RequestHeaderModifier' as const,
                requestHeaderModifier: {
                  set: [{ name: 'Host', value: 'a.internal' }],
                  add: [{ name: 'X-Added', value: 'val' }],
                },
              },
            ],
          },
        ],
      },
    });
    expect(classifyHttpProxyComplexity(raw)).to.equal('advanced');
  });

  it('returns advanced when requestHeaderModifier also has remove', () => {
    const raw = makeRaw({
      spec: {
        hostnames: [],
        rules: [
          {
            backends: [{ endpoint: 'https://api.example.com' }],
            filters: [
              {
                type: 'RequestHeaderModifier' as const,
                requestHeaderModifier: {
                  set: [{ name: 'Host', value: 'a.internal' }],
                  remove: ['X-Removed'],
                },
              },
            ],
          },
        ],
      },
    });
    expect(classifyHttpProxyComplexity(raw)).to.equal('advanced');
  });

  it('returns advanced when a backend has a backend-level filter', () => {
    const raw = makeRaw({
      spec: {
        hostnames: [],
        rules: [
          {
            backends: [
              {
                endpoint: 'https://api.example.com',
                filters: [
                  { requestHeaderModifier: { set: [{ name: 'Host', value: 'a.internal' }] } },
                ] as never,
              },
            ],
          },
        ],
      },
    });
    expect(classifyHttpProxyComplexity(raw)).to.equal('advanced');
  });
});

// ---------------------------------------------------------------------------
// validateHostHeader
// ---------------------------------------------------------------------------

describe('validateHostHeader', () => {
  it('accepts empty string (passthrough)', () => {
    expect(validateHostHeader('')).to.equal(null);
  });

  it('accepts localhost', () => {
    expect(validateHostHeader('localhost')).to.equal(null);
  });

  it('accepts localhost:8080', () => {
    expect(validateHostHeader('localhost:8080')).to.equal(null);
  });

  it('accepts example.internal', () => {
    expect(validateHostHeader('example.internal')).to.equal(null);
  });

  it('accepts *.internal', () => {
    expect(validateHostHeader('*.internal')).to.equal(null);
  });

  it('accepts *.localhost', () => {
    expect(validateHostHeader('*.localhost')).to.equal(null);
  });

  it('accepts api.example.com', () => {
    expect(validateHostHeader('api.example.com')).to.equal(null);
  });

  it('accepts hyphenated IP-shaped label 192-168-1-1.nip.io', () => {
    expect(validateHostHeader('192-168-1-1.nip.io')).to.equal(null);
  });

  it('rejects whitespace-only value', () => {
    expect(validateHostHeader('   ')).to.equal('Enter a hostname or leave the field blank.');
  });

  it('rejects value with internal whitespace', () => {
    expect(validateHostHeader('api example.com')).to.equal('Hostnames cannot contain spaces.');
  });

  it('rejects bare IPv4 address', () => {
    expect(validateHostHeader('192.168.1.10')).to.equal(
      'IP addresses are not valid Host header values. Use a hostname such as localhost or api.example.internal.'
    );
  });

  it('rejects bare IPv4 with port', () => {
    expect(validateHostHeader('192.168.1.10:8080')).to.equal(
      'IP addresses are not valid Host header values. Use a hostname such as localhost or api.example.internal.'
    );
  });

  it('rejects bare IPv6 with ::', () => {
    expect(validateHostHeader('::1')).to.equal(
      'IP addresses are not valid Host header values. Use a hostname such as localhost or api.example.internal.'
    );
  });

  it('rejects bracketed IPv6', () => {
    expect(validateHostHeader('[::1]')).to.equal(
      'IP addresses are not valid Host header values. Use a hostname such as localhost or api.example.internal.'
    );
  });

  it('rejects value exceeding 253 characters', () => {
    const longValue = 'a'.repeat(254);
    expect(validateHostHeader(longValue)).to.equal('Hostnames must be 253 characters or fewer.');
  });

  it('rejects hostname with illegal characters', () => {
    expect(validateHostHeader('api_example.com')).to.equal(
      'Enter a valid hostname (letters, numbers, hyphens, and dots only).'
    );
  });
});

// ---------------------------------------------------------------------------
// extractHostHeader (read path)
// ---------------------------------------------------------------------------

describe('extractHostHeader', () => {
  it('returns empty string when no filters', () => {
    expect(extractHostHeader(makeRaw())).to.equal('');
  });

  it('returns the Host value', () => {
    expect(extractHostHeader(makeRawWithHostFilter('example.internal'))).to.equal(
      'example.internal'
    );
  });

  it('reads case-insensitively (lowercase name in resource)', () => {
    const raw = makeRaw({
      spec: {
        hostnames: [],
        rules: [
          {
            backends: [{ endpoint: 'https://api.example.com' }],
            filters: [
              {
                type: 'RequestHeaderModifier' as const,
                requestHeaderModifier: {
                  set: [{ name: 'host', value: 'example.internal' }],
                },
              },
            ],
          },
        ],
      },
    });
    expect(extractHostHeader(raw)).to.equal('example.internal');
  });

  it('reads case-insensitively (HOST name in resource)', () => {
    const raw = makeRaw({
      spec: {
        hostnames: [],
        rules: [
          {
            backends: [{ endpoint: 'https://api.example.com' }],
            filters: [
              {
                type: 'RequestHeaderModifier' as const,
                requestHeaderModifier: {
                  set: [{ name: 'HOST', value: 'localhost' }],
                },
              },
            ],
          },
        ],
      },
    });
    expect(extractHostHeader(raw)).to.equal('localhost');
  });
});

// ---------------------------------------------------------------------------
// toCreateHttpProxyPayload (write path)
// ---------------------------------------------------------------------------

describe('toCreateHttpProxyPayload — hostHeader', () => {
  it('emits no filters when hostHeader is empty', () => {
    const payload = toCreateHttpProxyPayload({
      name: 'test',
      endpoint: 'https://api.example.com',
      hostHeader: '',
    });
    const backendRule = payload.spec.rules.find(
      (r) => 'backends' in r && r.backends.length > 0
    ) as { backends: object[]; filters?: object[] };
    expect(backendRule?.filters).to.equal(undefined);
  });

  it('emits no filters when hostHeader is undefined', () => {
    const payload = toCreateHttpProxyPayload({
      name: 'test',
      endpoint: 'https://api.example.com',
    });
    const backendRule = payload.spec.rules.find(
      (r) => 'backends' in r && r.backends.length > 0
    ) as { backends: object[]; filters?: object[] };
    expect(backendRule?.filters).to.equal(undefined);
  });

  it('emits no filters when hostHeader is whitespace-only', () => {
    const payload = toCreateHttpProxyPayload({
      name: 'test',
      endpoint: 'https://api.example.com',
      hostHeader: '   ',
    });
    const backendRule = payload.spec.rules.find(
      (r) => 'backends' in r && r.backends.length > 0
    ) as { backends: object[]; filters?: object[] };
    expect(backendRule?.filters).to.equal(undefined);
  });

  it('emits Host filter with capitalised name when hostHeader is set', () => {
    const payload = toCreateHttpProxyPayload({
      name: 'test',
      endpoint: 'https://api.example.com',
      hostHeader: 'example.internal',
    });
    const backendRule = payload.spec.rules.find(
      (r) => 'backends' in r && r.backends.length > 0
    ) as {
      backends: object[];
      filters?: Array<{ requestHeaderModifier: { set: Array<{ name: string; value: string }> } }>;
    };
    expect(backendRule?.filters).to.have.length(1);
    expect(backendRule?.filters?.[0].requestHeaderModifier.set[0].name).to.equal('Host');
    expect(backendRule?.filters?.[0].requestHeaderModifier.set[0].value).to.equal(
      'example.internal'
    );
  });

  it('trims whitespace from hostHeader before emitting', () => {
    const payload = toCreateHttpProxyPayload({
      name: 'test',
      endpoint: 'https://api.example.com',
      hostHeader: '  localhost  ',
    });
    const backendRule = payload.spec.rules.find(
      (r) => 'backends' in r && r.backends.length > 0
    ) as {
      backends: object[];
      filters?: Array<{ requestHeaderModifier: { set: Array<{ name: string; value: string }> } }>;
    };
    expect(backendRule?.filters?.[0].requestHeaderModifier.set[0].value).to.equal('localhost');
  });
});

// ---------------------------------------------------------------------------
// toUpdateHttpProxyPayload (write path)
// ---------------------------------------------------------------------------

describe('toUpdateHttpProxyPayload — hostHeader', () => {
  const currentProxy = {
    uid: 'uid-1',
    name: 'test-proxy',
    resourceVersion: '1',
    createdAt: new Date(),
    endpoint: 'https://api.example.com',
    chosenName: '',
    enableHttpRedirect: false,
  };

  it('preserves existing hostHeader when not included in input', () => {
    const proxyWithHost = { ...currentProxy, hostHeader: 'existing.internal' };
    const payload = toUpdateHttpProxyPayload(
      { endpoint: 'https://api.example.com' },
      proxyWithHost
    );
    const rules = payload.spec?.rules ?? [];
    const backendRule = rules.find((r) => 'backends' in r) as {
      backends: object[];
      filters?: Array<{ requestHeaderModifier: { set: Array<{ name: string; value: string }> } }>;
    };
    expect(backendRule?.filters?.[0].requestHeaderModifier.set[0].value).to.equal(
      'existing.internal'
    );
  });

  it('clears the filter when hostHeader is set to empty string', () => {
    const proxyWithHost = { ...currentProxy, hostHeader: 'existing.internal' };
    const payload = toUpdateHttpProxyPayload(
      { endpoint: 'https://api.example.com', hostHeader: '' },
      proxyWithHost
    );
    const rules = payload.spec?.rules ?? [];
    const backendRule = rules.find((r) => 'backends' in r) as {
      backends: object[];
      filters?: object[];
    };
    expect(backendRule?.filters).to.equal(undefined);
  });

  it('sets a new Host filter when hostHeader is provided', () => {
    const payload = toUpdateHttpProxyPayload(
      { endpoint: 'https://api.example.com', hostHeader: 'new.internal' },
      currentProxy
    );
    const rules = payload.spec?.rules ?? [];
    const backendRule = rules.find((r) => 'backends' in r) as {
      backends: object[];
      filters?: Array<{ requestHeaderModifier: { set: Array<{ name: string; value: string }> } }>;
    };
    expect(backendRule?.filters?.[0].requestHeaderModifier.set[0].name).to.equal('Host');
    expect(backendRule?.filters?.[0].requestHeaderModifier.set[0].value).to.equal('new.internal');
  });
});

// ---------------------------------------------------------------------------
// Round-trip parity
// ---------------------------------------------------------------------------

describe('round-trip parity', () => {
  it('simple resource round-trips without introducing filters', () => {
    const raw = makeRaw();
    const domain = toHttpProxy(raw);
    const payload = toCreateHttpProxyPayload({
      name: domain.name,
      endpoint: domain.endpoint ?? '',
      hostHeader: domain.hostHeader,
    });
    const backendRule = payload.spec.rules.find(
      (r) => 'backends' in r && r.backends.length > 0
    ) as { backends: object[]; filters?: object[] };
    expect(backendRule?.filters).to.equal(undefined);
  });

  it('host-only resource round-trips preserving the Host value', () => {
    const raw = makeRawWithHostFilter('example.internal');
    const domain = toHttpProxy(raw);
    expect(domain.hostHeader).to.equal('example.internal');

    const payload = toCreateHttpProxyPayload({
      name: domain.name,
      endpoint: domain.endpoint ?? '',
      hostHeader: domain.hostHeader,
    });
    const backendRule = payload.spec.rules.find(
      (r) => 'backends' in r && r.backends.length > 0
    ) as {
      backends: object[];
      filters?: Array<{ requestHeaderModifier: { set: Array<{ name: string; value: string }> } }>;
    };
    expect(backendRule?.filters?.[0].requestHeaderModifier.set[0].name).to.equal('Host');
    expect(backendRule?.filters?.[0].requestHeaderModifier.set[0].value).to.equal(
      'example.internal'
    );
  });

  it('wiki example resource round-trips correctly', () => {
    const wikiRaw = makeRaw({
      spec: {
        hostnames: ['my-proxy.example.com'],
        rules: [
          {
            filters: [
              {
                type: 'RequestHeaderModifier' as const,
                requestHeaderModifier: {
                  set: [{ name: 'Host', value: 'example.internal' }],
                },
              },
            ],
            backends: [{ endpoint: 'https://httpbin.org' }],
          },
        ],
      },
    });

    const domain = toHttpProxy(wikiRaw);
    expect(domain.hostHeader).to.equal('example.internal');

    const payload = toCreateHttpProxyPayload({
      name: domain.name,
      endpoint: domain.endpoint ?? '',
      hostHeader: domain.hostHeader,
    });

    const backendRule = payload.spec.rules.find(
      (r) => 'backends' in r && r.backends.length > 0
    ) as {
      backends: Array<{ endpoint: string }>;
      filters?: Array<{ requestHeaderModifier: { set: Array<{ name: string; value: string }> } }>;
    };

    expect(backendRule?.backends[0].endpoint).to.equal('https://httpbin.org');
    expect(backendRule?.filters?.[0].requestHeaderModifier.set).to.deep.equal([
      { name: 'Host', value: 'example.internal' },
    ]);
  });

  it('idempotent: round-trip does not alter a resource with no host header', () => {
    const raw = makeRaw();
    const domain = toHttpProxy(raw);
    const payload = toCreateHttpProxyPayload({
      name: domain.name,
      endpoint: domain.endpoint ?? '',
      tlsHostname: domain.tlsHostname,
      hostHeader: domain.hostHeader,
    });

    const backendRule = payload.spec.rules.find(
      (r) => 'backends' in r && r.backends.length > 0
    ) as { backends: object[]; filters?: object[] };
    expect(backendRule?.filters).to.equal(undefined);
  });
});

// ---------------------------------------------------------------------------
// toHttpProxy.complexity (FR-4 detection surfaced on the adapted shape)
// ---------------------------------------------------------------------------

describe('toHttpProxy complexity field', () => {
  it('classifies a plain backend rule as simple', () => {
    expect(toHttpProxy(makeRaw()).complexity).to.equal('simple');
  });

  it('classifies a host-only filter as host-only', () => {
    expect(toHttpProxy(makeRawWithHostFilter('example.internal')).complexity).to.equal('host-only');
  });

  it('classifies a backend-level filter as advanced', () => {
    const raw = makeRaw({
      spec: {
        hostnames: ['my-proxy.example.com'],
        rules: [
          {
            backends: [
              {
                endpoint: 'https://httpbin.org',
                filters: [
                  {
                    type: 'RequestHeaderModifier' as const,
                    requestHeaderModifier: {
                      set: [{ name: 'X-Custom', value: 'v' }],
                    },
                  },
                ],
              } as never,
            ],
          },
        ],
      },
    });
    expect(toHttpProxy(raw).complexity).to.equal('advanced');
  });
});
