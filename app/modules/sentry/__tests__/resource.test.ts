import { isKubernetesResource, parseApiVersion } from '../context/resource';
import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

describe('parseApiVersion', () => {
  test('parses apiVersion with group and version', () => {
    const result = parseApiVersion('networking.datumapis.com/v1alpha');

    assert.equal(result.apiGroup, 'networking.datumapis.com');
    assert.equal(result.version, 'v1alpha');
  });

  test('parses DNS networking apiVersion', () => {
    const result = parseApiVersion('dns.networking.miloapis.com/v1alpha1');

    assert.equal(result.apiGroup, 'dns.networking.miloapis.com');
    assert.equal(result.version, 'v1alpha1');
  });

  test('parses resource manager apiVersion', () => {
    const result = parseApiVersion('resourcemanager.miloapis.com/v1alpha1');

    assert.equal(result.apiGroup, 'resourcemanager.miloapis.com');
    assert.equal(result.version, 'v1alpha1');
  });

  test('parses core K8s apiVersion (v1) as core group', () => {
    const result = parseApiVersion('v1');

    assert.equal(result.apiGroup, 'core');
    assert.equal(result.version, 'v1');
  });

  test('parses authorization.k8s.io apiVersion', () => {
    const result = parseApiVersion('authorization.k8s.io/v1');

    assert.equal(result.apiGroup, 'authorization.k8s.io');
    assert.equal(result.version, 'v1');
  });
});

describe('isKubernetesResource', () => {
  test('returns true for valid K8s resource', () => {
    const resource = {
      kind: 'HTTPProxy',
      apiVersion: 'networking.datumapis.com/v1alpha',
      metadata: {
        name: 'my-proxy',
        namespace: 'default',
        uid: 'abc-123',
      },
    };

    assert.equal(isKubernetesResource(resource), true);
  });

  test('returns true for resource without namespace', () => {
    const resource = {
      kind: 'Organization',
      apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
      metadata: {
        name: 'my-org',
        uid: 'org-123',
      },
    };

    assert.equal(isKubernetesResource(resource), true);
  });

  test('returns true for resource without uid', () => {
    const resource = {
      kind: 'Secret',
      apiVersion: 'v1',
      metadata: {
        name: 'my-secret',
        namespace: 'default',
      },
    };

    assert.equal(isKubernetesResource(resource), true);
  });

  test('returns false for null', () => {
    assert.equal(isKubernetesResource(null), false);
  });

  test('returns false for undefined', () => {
    assert.equal(isKubernetesResource(undefined), false);
  });

  test('returns false for non-object', () => {
    assert.equal(isKubernetesResource('string'), false);
    assert.equal(isKubernetesResource(123), false);
    assert.equal(isKubernetesResource(true), false);
  });

  test('returns false for object without kind', () => {
    const resource = {
      apiVersion: 'v1',
      metadata: { name: 'test' },
    };

    assert.equal(isKubernetesResource(resource), false);
  });

  test('returns false for object without apiVersion', () => {
    const resource = {
      kind: 'Pod',
      metadata: { name: 'test' },
    };

    assert.equal(isKubernetesResource(resource), false);
  });

  test('returns false for object without metadata', () => {
    const resource = {
      kind: 'Pod',
      apiVersion: 'v1',
    };

    assert.equal(isKubernetesResource(resource), false);
  });

  test('returns false for object with metadata missing name', () => {
    const resource = {
      kind: 'Pod',
      apiVersion: 'v1',
      metadata: { uid: 'abc' },
    };

    assert.equal(isKubernetesResource(resource), false);
  });

  test('returns false for empty object', () => {
    assert.equal(isKubernetesResource({}), false);
  });

  test('returns false for array', () => {
    assert.equal(isKubernetesResource([]), false);
  });

  test('returns false for K8s list response', () => {
    const listResponse = {
      kind: 'HTTPProxyList',
      apiVersion: 'networking.datumapis.com/v1alpha',
      items: [],
    };

    // Lists don't have metadata.name, so should return false
    assert.equal(isKubernetesResource(listResponse), false);
  });
});
