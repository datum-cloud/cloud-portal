import type { Project, ProjectList } from './project.schema';

/** Self-delete navigates away before the layout deleting-redirect should run. */
const selfDeleteNavigationProjectNames = new Set<string>();

const SELF_DELETE_NAVIGATION_WINDOW_MS = 3_000;

export function markSelfDeleteNavigation(projectName: string): void {
  selfDeleteNavigationProjectNames.add(projectName);
  setTimeout(() => {
    selfDeleteNavigationProjectNames.delete(projectName);
  }, SELF_DELETE_NAVIGATION_WINDOW_MS);
}

export function isSelfDeleteNavigation(projectName: string): boolean {
  return selfDeleteNavigationProjectNames.has(projectName);
}

export function isProjectDeleting(project: Pick<Project, 'deletionTimestamp'>): boolean {
  return project.deletionTimestamp != null;
}

export function filterActiveProjects<T extends Pick<Project, 'deletionTimestamp'>>(
  projects: T[]
): T[] {
  return projects.filter((project) => !isProjectDeleting(project));
}

/** Patch a project list so the named project reads as mid-deletion. */
export function patchProjectListDeleting(
  list: ProjectList | undefined,
  name: string,
  project: Project | undefined,
  deletedAt: Date
): ProjectList | undefined {
  if (!list?.items) return list;

  const markDeleting = (item: Project): Project => ({
    ...item,
    deletionTimestamp: deletedAt,
  });

  const hasProject = list.items.some((item) => item.name === name);
  if (!hasProject) {
    if (!project) return list;
    return {
      ...list,
      items: [...list.items, markDeleting(project)],
    };
  }

  return {
    ...list,
    items: list.items.map((item) => (item.name === name ? markDeleting(item) : item)),
  };
}
