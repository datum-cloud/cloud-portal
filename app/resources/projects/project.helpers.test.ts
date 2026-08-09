import {
  filterActiveProjects,
  isProjectDeleting,
  isSelfDeleteNavigation,
  markSelfDeleteNavigation,
  patchProjectListDeleting,
} from './project.helpers';
import type { Project, ProjectList } from './project.schema';
import { describe, expect, it } from 'bun:test';

const deletedAt = new Date('2024-02-02T00:00:00Z');

const activeProject = {
  name: 'active',
  deletionTimestamp: undefined,
} as Project;

const deletingProject = {
  name: 'deleting',
  deletionTimestamp: deletedAt,
} as Project;

describe('isProjectDeleting', () => {
  it('returns true when deletionTimestamp is set', () => {
    expect(isProjectDeleting(deletingProject)).toBe(true);
  });

  it('returns false when deletionTimestamp is absent', () => {
    expect(isProjectDeleting(activeProject)).toBe(false);
  });
});

describe('filterActiveProjects', () => {
  it('removes deleting projects from the list', () => {
    expect(filterActiveProjects([activeProject, deletingProject]).map((p) => p.name)).toEqual([
      'active',
    ]);
  });
});

describe('selfDeleteNavigation', () => {
  it('marks a project as self-delete navigation for a short window', () => {
    markSelfDeleteNavigation('self-deleted');
    expect(isSelfDeleteNavigation('self-deleted')).toBe(true);
    expect(isSelfDeleteNavigation('other')).toBe(false);
  });
});

describe('patchProjectListDeleting', () => {
  const list: ProjectList = {
    items: [activeProject, { ...activeProject, name: 'target', uid: 'target' } as Project],
    hasMore: false,
    nextCursor: null,
  };

  it('marks an existing project as deleting', () => {
    const patched = patchProjectListDeleting(list, 'target', undefined, deletedAt);

    expect(patched?.items.find((item) => item.name === 'target')?.deletionTimestamp).toEqual(
      deletedAt
    );
  });

  it('appends the project when it is missing from the cached list', () => {
    const project = { ...activeProject, name: 'missing', uid: 'missing' } as Project;
    const patched = patchProjectListDeleting(list, 'missing', project, deletedAt);

    expect(patched?.items.map((item) => item.name)).toEqual(['active', 'target', 'missing']);
    expect(patched?.items.find((item) => item.name === 'missing')?.deletionTimestamp).toEqual(
      deletedAt
    );
  });

  it('returns the original list when the project is missing and no seed project is provided', () => {
    expect(patchProjectListDeleting(list, 'missing', undefined, deletedAt)).toBe(list);
  });
});
