import {
  buildAttachmentMapsFromPolicies,
  policyAttachesToProxy,
  selectPolicyForProxy,
} from './http-proxy.waf-attach';
import { describe, expect, it } from 'bun:test';

describe('policyAttachesToProxy', () => {
  it('requires a Gateway or HTTPRoute targetRef matching the proxy name', () => {
    expect(
      policyAttachesToProxy(
        {
          metadata: { name: 'nowaf-test' },
          spec: {
            targetRefs: [
              { group: 'gateway.networking.k8s.io', kind: 'Gateway', name: 'ws-test' },
            ],
          },
        },
        'ws-test'
      )
    ).toBe(true);

    expect(
      policyAttachesToProxy(
        {
          metadata: { name: 'nowaf-test' },
          spec: {
            targetRefs: [
              { group: 'gateway.networking.k8s.io', kind: 'Gateway', name: 'ws-test' },
            ],
          },
        },
        'nowaf-test'
      )
    ).toBe(false);

    expect(
      policyAttachesToProxy(
        {
          metadata: { name: 'ws-test' },
          spec: { targetRefs: [] },
        },
        'ws-test'
      )
    ).toBe(false);
  });
});

describe('selectPolicyForProxy', () => {
  it('prefers the portal same-name policy when several attach', () => {
    const selected = selectPolicyForProxy(
      [
        {
          metadata: { name: 'other' },
          spec: {
            mode: 'Observe',
            targetRefs: [
              { group: 'gateway.networking.k8s.io', kind: 'Gateway', name: 'ws-test' },
            ],
          },
        },
        {
          metadata: { name: 'ws-test' },
          spec: {
            mode: 'Enforce',
            targetRefs: [
              { group: 'gateway.networking.k8s.io', kind: 'Gateway', name: 'ws-test' },
            ],
          },
        },
      ],
      'ws-test'
    );
    expect(selected?.metadata?.name).toBe('ws-test');
  });
});

describe('buildAttachmentMapsFromPolicies', () => {
  it('keys modes by targetRef proxy name, not policy metadata.name', () => {
    const { modeByName } = buildAttachmentMapsFromPolicies(
      [
        {
          metadata: { name: 'nowaf-test' },
          spec: {
            mode: 'Enforce',
            targetRefs: [
              { group: 'gateway.networking.k8s.io', kind: 'Gateway', name: 'ws-test' },
            ],
          },
        },
      ],
      (policy) =>
        policy.spec?.mode === 'Enforce' || policy.spec?.mode === 'Observe'
          ? policy.spec.mode
          : undefined,
      () => undefined
    );

    expect(modeByName.get('ws-test')).toBe('Enforce');
    expect(modeByName.has('nowaf-test')).toBe(false);
  });
});
