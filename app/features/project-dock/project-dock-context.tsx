import {
  type DockWidgetDescriptor,
  useProjectDockWidgets,
} from '@/modules/plugins/client/plugin-dock';
import { createContext, use, useCallback, useMemo, useState } from 'react';

interface ProjectDockContextValue {
  widgets: DockWidgetDescriptor[];
  activeWidgetId: string | null;
  toggle: (widgetId: string) => void;
  close: () => void;
}

const ProjectDockContext = createContext<ProjectDockContextValue | null>(null);

/**
 * Holds which `portal.dock/project` widget is open. The header triggers and the
 * docked panel live in different parts of the layout, so both read it from here.
 */
export function ProjectDockProvider({
  projectId,
  children,
}: {
  projectId: string | undefined;
  children: React.ReactNode;
}) {
  const widgets = useProjectDockWidgets(projectId);
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);

  const toggle = useCallback(
    (widgetId: string) => setActiveWidgetId((prev) => (prev === widgetId ? null : widgetId)),
    []
  );
  const close = useCallback(() => setActiveWidgetId(null), []);

  const value = useMemo(
    () => ({ widgets, activeWidgetId, toggle, close }),
    [widgets, activeWidgetId, toggle, close]
  );

  return <ProjectDockContext value={value}>{children}</ProjectDockContext>;
}

export function useProjectDock(): ProjectDockContextValue {
  const ctx = use(ProjectDockContext);
  if (!ctx) throw new Error('useProjectDock must be used within a ProjectDockProvider');
  return ctx;
}
