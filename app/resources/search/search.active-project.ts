/**
 * The minimal project snapshot needed by search surfaces to render
 * "Searching in [project]" and to scope queries. We deliberately do
 * NOT persist the full Project object — only the few fields the search
 * UI reads. Renames upstream will show stale until the user revisits
 * the project page (acceptable for v3).
 */
export interface ActiveProject {
  id: string;
  displayName: string;
  orgId: string;
}

const STORAGE_KEY = 'datum-cloud-search-activeProject';

function isStorageAvailable(): boolean {
  return typeof localStorage !== 'undefined';
}

export function getActiveProject(): ActiveProject | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveProject;
    if (!parsed || typeof parsed.id !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setActiveProject(project: ActiveProject | null): void {
  if (!isStorageAvailable()) return;
  try {
    if (project === null) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch {
    // ignore — private mode, quota exceeded, etc.
  }
}

export function clearActiveProject(): void {
  setActiveProject(null);
}
