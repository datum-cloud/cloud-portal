import { ASSISTANT_DOCK_WIDGET_ID } from './home-mode';
import { useProjectDock } from '@/features/project-dock/project-dock-context';
import type { DockWidgetDescriptor } from '@/modules/plugins/client/plugin-dock';
import { useCallback } from 'react';

/**
 * Patch for this project, if it is installed: its widget (so the page can
 * embed it), and a way to open it in the side dock with a question or with a
 * conversation already under way.
 */
export function usePatch(): {
  widget: DockWidgetDescriptor | undefined;
  openInDock: (options: { prompt?: string; chatId?: string }) => void;
} {
  const { widgets, open } = useProjectDock();
  const widget = widgets.find((w) => w.id === ASSISTANT_DOCK_WIDGET_ID);
  const openInDock = useCallback(
    (options: { prompt?: string; chatId?: string }) => open(ASSISTANT_DOCK_WIDGET_ID, options),
    [open]
  );
  return { widget, openInDock };
}
