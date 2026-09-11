import { toSearchHit, toSearchResult } from './search.adapter';
import { describe, expect, it } from 'bun:test';

describe('toSearchHit', () => {
  it('extracts uid, name, namespace, apiVersion, kind, relevanceScore, tenant', () => {
    const raw = {
      resource: {
        apiVersion: 'dns.networking.miloapis.com/v1alpha1',
        kind: 'DNSZone',
        metadata: { uid: 'u1', name: 'acme-zone', namespace: 'acme-prod' },
      },
      relevanceScore: 0.92,
      tenant: { name: 'acme-prod', type: 'Project' },
    };
    expect(toSearchHit(raw as never)).toEqual({
      uid: 'u1',
      name: 'acme-zone',
      displayName: undefined,
      description: undefined,
      namespace: 'acme-prod',
      apiVersion: 'dns.networking.miloapis.com/v1alpha1',
      kind: 'DNSZone',
      relevanceScore: 0.92,
      tenant: { name: 'acme-prod', type: 'Project' },
    });
  });

  it('extracts displayName from resource.spec.domainName when present', () => {
    const raw = {
      resource: {
        apiVersion: 'networking.miloapis.com/v1alpha1',
        kind: 'Domain',
        metadata: { uid: 'u2', name: 'd-abc123' },
        spec: { domainName: 'hiyahya.dev' },
      },
      relevanceScore: 0.8,
      tenant: { name: 'molla-e29bml', type: 'Project' },
    };
    expect(toSearchHit(raw as never).displayName).toBe('hiyahya.dev');
  });

  it('leaves displayName undefined when resource.spec.domainName is absent', () => {
    const raw = {
      resource: {
        apiVersion: 'v1',
        kind: 'Project',
        metadata: { uid: 'u3', name: 'molla' },
      },
      relevanceScore: 0.7,
      tenant: { name: 'molla-e29bml', type: 'Project' },
    };
    expect(toSearchHit(raw as never).displayName).toBeUndefined();
  });

  it('extracts displayName from app.kubernetes.io/name when domainName is absent', () => {
    const raw = {
      resource: {
        apiVersion: 'networking.datumapis.com/v1alpha',
        kind: 'HTTPProxy',
        metadata: {
          uid: 'u-alb-1',
          name: 'alb-abc123',
          annotations: { 'app.kubernetes.io/name': 'Production ALB' },
        },
      },
      relevanceScore: 0.85,
      tenant: { name: 'acme-prod', type: 'Project' },
    };
    expect(toSearchHit(raw as never).displayName).toBe('Production ALB');
  });

  it('falls back to kubernetes.io/display-name when app.kubernetes.io/name is absent', () => {
    const raw = {
      resource: {
        apiVersion: 'networking.datumapis.com/v1alpha',
        kind: 'HTTPProxy',
        metadata: {
          uid: 'u-alb-2',
          name: 'alb-xyz789',
          annotations: { 'kubernetes.io/display-name': 'Legacy ALB' },
        },
      },
      relevanceScore: 0.85,
      tenant: { name: 'acme-prod', type: 'Project' },
    };
    expect(toSearchHit(raw as never).displayName).toBe('Legacy ALB');
  });

  it('leaves displayName undefined when HTTPProxy name annotations are empty', () => {
    const raw = {
      resource: {
        apiVersion: 'networking.datumapis.com/v1alpha',
        kind: 'HTTPProxy',
        metadata: {
          uid: 'u-alb-3',
          name: 'alb-empty',
          annotations: {
            'app.kubernetes.io/name': '',
            'kubernetes.io/display-name': '',
          },
        },
      },
      relevanceScore: 0.85,
      tenant: { name: 'acme-prod', type: 'Project' },
    };
    expect(toSearchHit(raw as never).displayName).toBeUndefined();
  });

  it('prefers spec.domainName over both name annotations', () => {
    const raw = {
      resource: {
        apiVersion: 'networking.miloapis.com/v1alpha1',
        kind: 'Domain',
        metadata: {
          uid: 'u-both',
          name: 'd-abc123',
          annotations: {
            'app.kubernetes.io/name': 'Chosen Domain',
            'kubernetes.io/display-name': 'Friendly Domain',
          },
        },
        spec: { domainName: 'hiyahya.dev' },
      },
      relevanceScore: 0.8,
      tenant: { name: 'molla-e29bml', type: 'Project' },
    };
    expect(toSearchHit(raw as never).displayName).toBe('hiyahya.dev');
  });

  it('prefers app.kubernetes.io/name over kubernetes.io/display-name when domainName is absent', () => {
    const raw = {
      resource: {
        apiVersion: 'networking.datumapis.com/v1alpha',
        kind: 'HTTPProxy',
        metadata: {
          uid: 'u-alb-4',
          name: 'alb-both',
          annotations: {
            'app.kubernetes.io/name': 'Chosen ALB',
            'kubernetes.io/display-name': 'Display ALB',
          },
        },
      },
      relevanceScore: 0.85,
      tenant: { name: 'acme-prod', type: 'Project' },
    };
    expect(toSearchHit(raw as never).displayName).toBe('Chosen ALB');
  });

  it('extracts description from metadata.annotations["kubernetes.io/description"]', () => {
    const raw = {
      resource: {
        apiVersion: 'dns.networking.miloapis.com/v1alpha1',
        kind: 'DNSZone',
        metadata: {
          uid: 'u4',
          name: 'acme-zone',
          annotations: { 'kubernetes.io/description': 'Primary zone for acme.example' },
        },
      },
      relevanceScore: 0.9,
      tenant: { name: 'acme-prod', type: 'Project' },
    };
    expect(toSearchHit(raw as never).description).toBe('Primary zone for acme.example');
  });

  it('leaves description undefined when annotation is absent', () => {
    const raw = {
      resource: {
        apiVersion: 'dns.networking.miloapis.com/v1alpha1',
        kind: 'DNSZone',
        metadata: { uid: 'u5', name: 'acme-zone', annotations: {} },
      },
      relevanceScore: 0.9,
      tenant: { name: 'acme-prod', type: 'Project' },
    };
    expect(toSearchHit(raw as never).description).toBeUndefined();
  });

  it('defaults missing tenant info', () => {
    const raw = { resource: { metadata: { uid: 'u', name: 'x' } } };
    const hit = toSearchHit(raw as never);
    expect(hit.tenant).toEqual({ name: '', type: '' });
  });

  it('defaults missing relevanceScore to 0', () => {
    const raw = { resource: { metadata: { uid: 'u', name: 'x' } } };
    expect(toSearchHit(raw as never).relevanceScore).toBe(0);
  });

  it('handles missing metadata fields with empty-string defaults', () => {
    const raw = { resource: {} };
    const hit = toSearchHit(raw as never);
    expect(hit.uid).toBe('');
    expect(hit.name).toBe('');
    expect(hit.kind).toBe('');
    expect(hit.apiVersion).toBe('');
  });
});

describe('toSearchResult', () => {
  it('returns empty hits and no continue token when status is missing', () => {
    expect(toSearchResult({} as never)).toEqual({
      hits: [],
      deniedKinds: [],
      nextContinueToken: undefined,
    });
  });

  it('maps all hits and preserves order', () => {
    const raw = {
      status: {
        results: [
          {
            resource: { metadata: { uid: 'a', name: 'first' } },
            relevanceScore: 0.9,
            tenant: { name: 't', type: 'Project' },
          },
          {
            resource: { metadata: { uid: 'b', name: 'second' } },
            relevanceScore: 0.8,
            tenant: { name: 't', type: 'Project' },
          },
        ],
      },
    };
    const out = toSearchResult(raw as never);
    expect(out.hits.map((h) => h.uid)).toEqual(['a', 'b']);
  });

  it('parses denied kinds from status.deniedTargetResources when present', () => {
    const raw = {
      status: {
        results: [],
        deniedTargetResources: [{ group: 'core', version: 'v1', kind: 'Secret' }],
      },
    };
    expect(toSearchResult(raw as never).deniedKinds).toEqual([
      { group: 'core', version: 'v1', kind: 'Secret' },
    ]);
  });

  it('returns empty deniedKinds when field absent', () => {
    const raw = { status: { results: [] } };
    expect(toSearchResult(raw as never).deniedKinds).toEqual([]);
  });

  it('forwards continue token', () => {
    const raw = { status: { results: [], continue: 'next-page-token' } };
    expect(toSearchResult(raw as never).nextContinueToken).toBe('next-page-token');
  });
});
