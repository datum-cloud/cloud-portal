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

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}
