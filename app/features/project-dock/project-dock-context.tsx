import {
  type DockWidgetDescriptor,
  useProjectDockWidgets,
} from '@/modules/plugins/client/plugin-dock';
import { createContext, use, useCallback, useMemo, useState } from 'react';

/** A question the host asks a widget to send. A new id is a new request, even with the same text. */
export interface DockPrompt {
  id: string;
  text: string;
}

interface ProjectDockContextValue {
  widgets: DockWidgetDescriptor[];
  activeWidgetId: string | null;
  /** The latest prompt each widget was opened with, keyed by widget id. */
  prompts: Readonly<Record<string, DockPrompt>>;
  toggle: (widgetId: string) => void;
  /** Opens a widget (no-op toggle if already open), optionally asking it something. */
  open: (widgetId: string, options?: { prompt?: string }) => void;
  close: () => void;
}

const ProjectDockContext = createContext<ProjectDockContextValue | null>(null);

/**
 * Holds which `portal.dock/project` widget is open, and any prompt the page
 * opened it with. The header triggers, the docked panel and page content (such
 * as the home page's "Help me connect something") live in different parts of
 * the layout, so all of them read it from here.
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
  const [prompts, setPrompts] = useState<Record<string, DockPrompt>>({});

  const toggle = useCallback(
    (widgetId: string) => setActiveWidgetId((prev) => (prev === widgetId ? null : widgetId)),
    []
  );
  const open = useCallback((widgetId: string, options?: { prompt?: string }) => {
    setActiveWidgetId(widgetId);
    const text = options?.prompt?.trim();
    if (text) {
      setPrompts((prev) => ({ ...prev, [widgetId]: { id: crypto.randomUUID(), text } }));
    }
  }, []);
  const close = useCallback(() => setActiveWidgetId(null), []);

  const value = useMemo(
    () => ({ widgets, activeWidgetId, prompts, toggle, open, close }),
    [widgets, activeWidgetId, prompts, toggle, open, close]
  );

  return <ProjectDockContext value={value}>{children}</ProjectDockContext>;
}

export function useProjectDock(): ProjectDockContextValue {
  const ctx = use(ProjectDockContext);
  if (!ctx) throw new Error('useProjectDock must be used within a ProjectDockProvider');
  return ctx;
}
