import {
  findReadyProjectPolicyBinding,
  isProjectAccessGrantReady,
  policyBindingTargetsProject,
} from './project-access';
import type { PolicyBinding } from '@/resources/policy-bindings/policy-binding.schema';
import { describe, expect, it } from 'bun:test';

const projectId = 'project-abc';

function binding(overrides: Partial<PolicyBinding> = {}): PolicyBinding {
  return {
    uid: 'uid-1',
    name: 'pb-1',
    namespace: 'organization-org-1',
    resourceVersion: '1',
    createdAt: '2026-01-01T00:00:00Z',
    subjects: [],
    resourceSelector: {
      resourceRef: {
        apiGroup: 'resourcemanager.miloapis.com',
        kind: 'Project',
        name: projectId,
      },
    },
    status: {
      conditions: [
        { type: 'Ready', status: 'True', reason: 'Ready', message: '', lastTransitionTime: '' },
      ],
    },
    ...overrides,
  };
}

describe('policyBindingTargetsProject', () => {
  it('matches project resource refs case-insensitively', () => {
    expect(policyBindingTargetsProject(binding(), projectId)).toBe(true);
    expect(
      policyBindingTargetsProject(
        binding({
          resourceSelector: {
            resourceRef: {
              kind: 'project',
              name: projectId,
            },
          },
        }),
        projectId
      )
    ).toBe(true);
  });

  it('rejects bindings for other projects', () => {
    expect(policyBindingTargetsProject(binding(), 'other-project')).toBe(false);
  });
});

describe('findReadyProjectPolicyBinding', () => {
  it('returns a ready binding targeting the project', () => {
    const ready = binding();
    expect(findReadyProjectPolicyBinding([ready], projectId)).toBe(ready);
  });

  it('ignores bindings that are not ready', () => {
    const pending = binding({
      status: {
        conditions: [
          {
            type: 'Ready',
            status: 'False',
            reason: 'Pending',
            message: '',
            lastTransitionTime: '',
          },
        ],
      },
    });
    expect(findReadyProjectPolicyBinding([pending], projectId)).toBeUndefined();
  });
});

describe('isProjectAccessGrantReady', () => {
  it('requires membership readiness and a ready project binding', () => {
    expect(isProjectAccessGrantReady([binding()], projectId, true)).toBe(true);
    expect(isProjectAccessGrantReady([binding()], projectId, false)).toBe(false);
    expect(isProjectAccessGrantReady([], projectId, true)).toBe(false);
  });
});
