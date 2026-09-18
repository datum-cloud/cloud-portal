/// <reference types="bun-types/test" />
import type { LoaderPermissionCheck } from './check-permission';
import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

// `canInLoaderBulk` constructs `new RbacService()` with the default
// access-review factory, so there is no injection seam — `mock.module` is the
// supported Bun primitive for replacing it. That registry is process-global for
// the rest of the test run, so capture the real module first, spread it, and
// reinstall it in `afterAll` (same protocol as define-resource-route.test.ts).
const actualRbacService = await import('./rbac.service');
// Snapshot by value: `mock.module` mutates the live namespace object in place,
// so restoring from `actualRbacService` itself would reinstall the stub.
const realRbacService = { ...actualRbacService };

type BulkResult = { allowed: boolean; denied: boolean };

/** Set per test: what the stubbed `checkPermissions` does with its checks. */
let bulkImpl: (checks: LoaderPermissionCheck[]) => Promise<BulkResult[]>;
/** Every `checks` array the stubbed `checkPermissions` was handed. */
let bulkCalls: LoaderPermissionCheck[][] = [];
/** How many times the stubbed RbacService was constructed. */
let constructed = 0;

mock.module('./rbac.service', () => ({
  ...actualRbacService,
  RbacService: class {
    constructor() {
      constructed += 1;
    }
    async checkPermissions(_organizationId: string, checks: LoaderPermissionCheck[]) {
      bulkCalls.push(checks);
      return bulkImpl(checks);
    }
  },
}));

// Import AFTER the mock is registered so the SUT picks it up.
const { canInLoaderBulk } = await import('./check-permission');

afterAll(() => {
  mock.module('./rbac.service', () => realRbacService);
});

beforeEach(() => {
  bulkCalls = [];
  constructed = 0;
  bulkImpl = async (checks) => checks.map(() => ({ allowed: true, denied: false }));
});

/** The single batch handed to the underlying bulk check. */
const sentChecks = () => bulkCalls[0] ?? [];

const check = (over: Partial<LoaderPermissionCheck> = {}): LoaderPermissionCheck => ({
  resource: 'projects',
  verb: 'get',
  ...over,
});

describe('canInLoaderBulk > dedupe', () => {
  test('collapses identical checks into one access review and fans the verdict out', async () => {
    bulkImpl = async () => [{ allowed: false, denied: true }];

    const verdicts = await canInLoaderBulk('acme', [check(), check(), check()]);

    expect(sentChecks()).toHaveLength(1);
    // One verdict per INPUT check, in input order — not one per unique check.
    expect(verdicts).toEqual([false, false, false]);
  });

  test('preserves input order when duplicates are interleaved with distinct checks', async () => {
    bulkImpl = async (checks) =>
      checks.map((c) => ({
        allowed: c.resource === 'projects',
        denied: c.resource !== 'projects',
      }));

    const verdicts = await canInLoaderBulk('acme', [
      check(),
      check({ resource: 'dnszones', verb: 'list' }),
      check(),
    ]);

    expect(sentChecks()).toHaveLength(2);
    expect(verdicts).toEqual([true, false, true]);
  });

  test("group '' and undefined are the same request (RbacService normalizes with `|| ''`)", async () => {
    await canInLoaderBulk('acme', [check({ group: '' }), check({ group: undefined })]);
    expect(sentChecks()).toHaveLength(1);
  });

  test('scope undefined and explicit org are the same request (both default to org)', async () => {
    await canInLoaderBulk('acme', [check({ scope: undefined }), check({ scope: 'org' })]);
    expect(sentChecks()).toHaveLength(1);
  });

  test("namespace '' and undefined are DIFFERENT requests (resolveNamespace branches on undefined)", async () => {
    await canInLoaderBulk('acme', [check({ namespace: '' }), check({ namespace: undefined })]);
    expect(sentChecks()).toHaveLength(2);
  });

  test('name, projectId, scope, group, resource and verb each split a batch', async () => {
    const cases: Array<[string, LoaderPermissionCheck, LoaderPermissionCheck]> = [
      ['name', check({ name: undefined }), check({ name: 'x' })],
      [
        'projectId',
        check({ scope: 'project', projectId: 'p1' }),
        check({ scope: 'project', projectId: 'p2' }),
      ],
      ['scope', check({ scope: 'user' }), check({ scope: 'project', projectId: 'p1' })],
      ['group', check({ group: 'a.example.com' }), check({ group: 'b.example.com' })],
      ['resource', check({ resource: 'projects' }), check({ resource: 'dnszones' })],
      ['verb', check({ verb: 'get' }), check({ verb: 'list' })],
    ];

    for (const [label, a, b] of cases) {
      bulkCalls = [];
      await canInLoaderBulk('acme', [a, b]);
      expect(`${label}:${sentChecks().length}`).toBe(`${label}:2`);
    }
  });
});

describe('canInLoaderBulk > fail-closed', () => {
  test('allowed AND denied both true → false', async () => {
    bulkImpl = async () => [{ allowed: true, denied: true }];
    expect(await canInLoaderBulk('acme', [check()])).toEqual([false]);
  });

  test('whole-call rejection → all false, input length preserved', async () => {
    bulkImpl = async () => {
      throw new Error('boom');
    };
    const verdicts = await canInLoaderBulk('acme', [
      check(),
      check({ resource: 'dnszones', verb: 'list' }),
    ]);
    expect(verdicts).toEqual([false, false]);
  });

  test('short result array → false for the missing slot', async () => {
    bulkImpl = async () => [{ allowed: true, denied: false }];
    const verdicts = await canInLoaderBulk('acme', [
      check(),
      check({ resource: 'dnszones', verb: 'list' }),
    ]);
    expect(verdicts).toEqual([true, false]);
  });

  test('empty input → empty output, no service constructed', async () => {
    expect(await canInLoaderBulk('acme', [])).toEqual([]);
    expect(constructed).toBe(0);
    expect(bulkCalls).toHaveLength(0);
  });
});
