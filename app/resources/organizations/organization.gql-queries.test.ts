/// <reference types="bun-types/test" />
import { organizationsListQueryKey } from './organization.gql-queries';
import { organizationKeys } from './organization.service';
import { describe, expect, it } from 'bun:test';

/**
 * `invalidateQueries({ queryKey })` in TanStack Query matches by PREFIX. Every
 * write path that changes the organization list invalidates
 * `organizationKeys.lists()` and relies on that prefix reaching the gateway
 * list this hook actually reads.
 *
 * Nothing in the type system enforces the relationship, and when it breaks it
 * breaks silently: the mutation still "succeeds", and the header switcher and
 * /account/organizations just keep serving a stale list for the whole
 * QUERY_STALE_TIME window. That is exactly the bug this guards.
 */
describe('organizationsListQueryKey', () => {
  it('sits under organizationKeys.lists() so list invalidation reaches it', () => {
    const lists = organizationKeys.lists();

    expect(organizationsListQueryKey.length).toBeGreaterThan(lists.length);
    expect(organizationsListQueryKey.slice(0, lists.length)).toEqual([...lists]);
  });
});
