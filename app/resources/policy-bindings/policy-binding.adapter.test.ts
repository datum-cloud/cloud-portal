import {
  toCreatePolicyBindingPayload,
  toPolicyBinding,
  toPolicyBindingList,
  toUpdatePolicyBindingPayload,
} from './policy-binding.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toPolicyBinding', () => {
  it('maps subjects, roleRef and the resourceRef selector', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'pb-1', name: 'binding-1' }),
      spec: {
        subjects: [{ kind: 'User', name: 'user-a', uid: 'u1', namespace: 'ns' }],
        roleRef: { name: 'project-admin', namespace: 'datum-cloud' },
        resourceSelector: {
          resourceRef: {
            apiGroup: 'resourcemanager.miloapis.com',
            kind: 'Project',
            name: 'proj-1',
            namespace: 'ns',
            uid: 'p1',
          },
        },
      },
      status: { observedGeneration: 1 },
    };
    const pb = toPolicyBinding(raw as never);

    expect(pb.subjects).toEqual([{ kind: 'User', name: 'user-a', uid: 'u1', namespace: 'ns' }]);
    expect(pb.roleRef).toEqual({ name: 'project-admin', namespace: 'datum-cloud' });
    expect(pb.resourceSelector?.resourceRef?.name).toBe('proj-1');
    expect(pb.resourceSelector?.resourceKind).toBeUndefined();
  });

  it('maps the resourceKind selector variant when present', () => {
    const raw = {
      metadata: rawMetadata({ name: 'binding-2' }),
      spec: {
        subjects: [],
        resourceSelector: {
          resourceKind: { apiGroup: 'resourcemanager.miloapis.com', kind: 'Project' },
        },
      },
    };
    const pb = toPolicyBinding(raw as never);
    expect(pb.resourceSelector?.resourceKind).toEqual({
      apiGroup: 'resourcemanager.miloapis.com',
      kind: 'Project',
    });
    expect(pb.resourceSelector?.resourceRef).toBeUndefined();
  });

  it('defaults subjects to empty and leaves selector/roleRef undefined when absent', () => {
    const pb = toPolicyBinding({ metadata: { name: 'x' }, spec: {} } as never);
    expect(pb.subjects).toEqual([]);
    expect(pb.roleRef).toBeUndefined();
    expect(pb.resourceSelector).toBeUndefined();
  });
});

describe('toPolicyBindingList', () => {
  it('maps items and surfaces pagination', () => {
    const list = toPolicyBindingList([{ metadata: { uid: 'a' }, spec: {} }] as never, 'tok');
    expect(list.items[0].uid).toBe('a');
    expect(list.hasMore).toBe(true);
  });
});

const createInput = {
  resource: { ref: 'resourcemanager.miloapis.com-project', name: 'My Project', uid: 'p1' },
  role: 'project-admin',
  subjects: [{ kind: 'User', name: 'user-a', uid: 'u1' }],
};

describe('toCreatePolicyBindingPayload', () => {
  it('resolves apiGroup/kind from POLICY_RESOURCES and defaults roleRef namespace', () => {
    const payload = toCreatePolicyBindingPayload(createInput as never);

    expect(payload.apiVersion).toBe('iam.miloapis.com/v1alpha1');
    expect(payload.spec?.resourceSelector?.resourceRef).toEqual({
      apiGroup: 'resourcemanager.miloapis.com',
      kind: 'Project',
      name: 'My Project',
      uid: 'p1',
    });
    expect(payload.spec?.roleRef).toEqual({ name: 'project-admin', namespace: 'datum-cloud' });
    expect(payload.spec?.subjects).toEqual([{ kind: 'User', name: 'user-a', uid: 'u1' }]);
  });

  it('generates a sanitized metadata.name on create', () => {
    const payload = toCreatePolicyBindingPayload(createInput as never);
    // `${sanitize(kind)}-${sanitize(name)}-${random}` => project-my-project-XXXXXX
    expect(payload.metadata?.name).toMatch(/^project-my-project-/);
  });
});

describe('toUpdatePolicyBindingPayload', () => {
  it('omits metadata.name on edit (patch keeps the existing name)', () => {
    const payload = toUpdatePolicyBindingPayload(createInput as never);
    expect(payload.metadata).toBeUndefined();
    expect(payload.spec?.roleRef?.namespace).toBe('datum-cloud');
  });
});
