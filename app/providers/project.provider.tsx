import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import { createContext, useContext, type ReactNode } from 'react';

export interface ProjectContextValue {
  project: Project | undefined;
  org: Organization | undefined;
  isLoading: boolean;
  error: Error | null;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ProjectContextValue;
}) {
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

/**
 * Non-throwing context read. `useProjectContext` throws by design — a project
 * page cannot function without the context. But org-scoped code paths share
 * the same resource hooks as project-scoped ones, so read-only-mode helpers
 * (useProjectMode, useGuardedMutation) must degrade to "no project, not
 * read-only" instead of crashing an org page.
 */
export function useOptionalProjectContext(): ProjectContextValue | null {
  return useContext(ProjectContext);
}

export function useProjectContext() {
  const context = useOptionalProjectContext();
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}
