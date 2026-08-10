/// <reference types="bun-types/test" />
import { hasUnresolvedProjectScope } from './project-scope-guard';
import { describe, expect, test } from 'bun:test';

describe('hasUnresolvedProjectScope', () => {
  test('flags a project-scoped batch while projectId is unresolved', () => {
    // Regression: the org→project navigation window (orgId set, project not
    // yet) used to fire this exact batch and trip the server invariant.
    const checks = [
      { scope: 'project' as const },
      { scope: 'project' as const },
    ];
    expect(hasUnresolvedProjectScope(checks, undefined)).toBe(true);
  });

  test('flags a mixed batch containing any project-scoped check', () => {
    const checks = [{ scope: 'org' as const }, { scope: 'project' as const }];
    expect(hasUnresolvedProjectScope(checks, undefined)).toBe(true);
  });

  test('passes once projectId resolves', () => {
    expect(hasUnresolvedProjectScope([{ scope: 'project' as const }], 'proj-1')).toBe(false);
  });

  test('passes org/user/unscoped batches without a projectId', () => {
    const checks = [{ scope: 'org' as const }, { scope: 'user' as const }, {}];
    expect(hasUnresolvedProjectScope(checks, undefined)).toBe(false);
  });

  test('passes an empty batch', () => {
    expect(hasUnresolvedProjectScope([], undefined)).toBe(false);
  });

  test('treats an empty-string projectId as unresolved', () => {
    expect(hasUnresolvedProjectScope([{ scope: 'project' as const }], '')).toBe(true);
  });
});
