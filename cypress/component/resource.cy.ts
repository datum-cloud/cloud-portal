import { isKubernetesResource, parseApiVersion } from '@/modules/sentry/context/resource';

describe('parseApiVersion', () => {
  it('parses apiVersion with group and version', () => {
    const result = parseApiVersion('networking.datumapis.com/v1alpha');

    expect(result.apiGroup).to.equal('networking.datumapis.com');
    expect(result.version).to.equal('v1alpha');
  });

  it('parses DNS networking apiVersion', () => {
    const result = parseApiVersion('dns.networking.miloapis.com/v1alpha1');

    expect(result.apiGroup).to.equal('dns.networking.miloapis.com');
    expect(result.version).to.equal('v1alpha1');
  });

  it('parses resource manager apiVersion', () => {
    const result = parseApiVersion('resourcemanager.miloapis.com/v1alpha1');

    expect(result.apiGroup).to.equal('resourcemanager.miloapis.com');
    expect(result.version).to.equal('v1alpha1');
  });

  it('parses core K8s apiVersion (v1) as core group', () => {
    const result = parseApiVersion('v1');

    expect(result.apiGroup).to.equal('core');
    expect(result.version).to.equal('v1');
  });

  it('parses authorization.k8s.io apiVersion', () => {
    const result = parseApiVersion('authorization.k8s.io/v1');

    expect(result.apiGroup).to.equal('authorization.k8s.io');
    expect(result.version).to.equal('v1');
  });
});

describe('isKubernetesResource', () => {
  it('returns true for valid K8s resource', () => {
    const resource = {
      kind: 'HTTPProxy',
      apiVersion: 'networking.datumapis.com/v1alpha',
      metadata: {
        name: 'my-proxy',
        namespace: 'default',
        uid: 'abc-123',
      },
    };

    expect(isKubernetesResource(resource)).to.equal(true);
  });

  it('returns true for resource without namespace', () => {
    const resource = {
      kind: 'Organization',
      apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
      metadata: {
        name: 'my-org',
        uid: 'org-123',
      },
    };

    expect(isKubernetesResource(resource)).to.equal(true);
  });

  it('returns true for resource without uid', () => {
    const resource = {
      kind: 'Secret',
      apiVersion: 'v1',
      metadata: {
        name: 'my-secret',
        namespace: 'default',
      },
    };

    expect(isKubernetesResource(resource)).to.equal(true);
  });

  it('returns false for null', () => {
    expect(isKubernetesResource(null)).to.equal(false);
  });

  it('returns false for undefined', () => {
    expect(isKubernetesResource(undefined)).to.equal(false);
  });

  it('returns false for non-object', () => {
    expect(isKubernetesResource('string')).to.equal(false);
    expect(isKubernetesResource(123)).to.equal(false);
    expect(isKubernetesResource(true)).to.equal(false);
  });

  it('returns false for object without kind', () => {
    const resource = {
      apiVersion: 'v1',
      metadata: { name: 'test' },
    };

    expect(isKubernetesResource(resource)).to.equal(false);
  });

  it('returns false for object without apiVersion', () => {
    const resource = {
      kind: 'Pod',
      metadata: { name: 'test' },
    };

    expect(isKubernetesResource(resource)).to.equal(false);
  });

  it('returns false for object without metadata', () => {
    const resource = {
      kind: 'Pod',
      apiVersion: 'v1',
    };

    expect(isKubernetesResource(resource)).to.equal(false);
  });

  it('returns false for object with metadata missing name', () => {
    const resource = {
      kind: 'Pod',
      apiVersion: 'v1',
      metadata: { uid: 'abc' },
    };

    expect(isKubernetesResource(resource)).to.equal(false);
  });

  it('returns false for empty object', () => {
    expect(isKubernetesResource({})).to.equal(false);
  });

  it('returns false for array', () => {
    expect(isKubernetesResource([])).to.equal(false);
  });

  it('returns false for K8s list response', () => {
    const listResponse = {
      kind: 'HTTPProxyList',
      apiVersion: 'networking.datumapis.com/v1alpha',
      items: [],
    };

    // Lists don't have metadata.name, so should return false
    expect(isKubernetesResource(listResponse)).to.equal(false);
  });
});
