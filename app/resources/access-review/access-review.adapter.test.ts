import { toAccessReviewResult, toCreateAccessReviewPayload } from './access-review.adapter';
import { describe, expect, it } from 'bun:test';

describe('toAccessReviewResult', () => {
  it('maps status decision and resource attributes', () => {
    const raw = {
      spec: {
        resourceAttributes: { namespace: 'ns', verb: 'get', group: 'g', resource: 'secrets' },
      },
      status: { allowed: true, denied: false },
    };
    expect(toAccessReviewResult(raw as never)).toEqual({
      allowed: true,
      denied: false,
      namespace: 'ns',
      verb: 'get',
      group: 'g',
      resource: 'secrets',
    });
  });

  it('fails closed (allowed/denied false) when status is absent', () => {
    const result = toAccessReviewResult({} as never);
    expect(result.allowed).toBe(false);
    expect(result.denied).toBe(false);
    expect(result.verb).toBeUndefined();
  });
});

describe('toCreateAccessReviewPayload', () => {
  it('builds a SelfSubjectAccessReview with the given resource attributes', () => {
    expect(
      toCreateAccessReviewPayload({
        namespace: 'ns',
        verb: 'delete',
        group: 'g',
        resource: 'secrets',
        name: 'my-secret',
      } as never)
    ).toEqual({
      apiVersion: 'authorization.k8s.io/v1',
      kind: 'SelfSubjectAccessReview',
      spec: {
        resourceAttributes: {
          namespace: 'ns',
          verb: 'delete',
          group: 'g',
          resource: 'secrets',
          name: 'my-secret',
        },
      },
    });
  });
});
