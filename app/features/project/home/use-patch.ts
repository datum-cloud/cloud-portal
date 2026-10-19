import { ASSISTANT_DOCK_WIDGET_ID } from './home-mode';
import { useProjectDock } from '@/features/project-dock/project-dock-context';
import { useCallback } from 'react';

/** Whether Patch is installed for this project, and a way to open it with a question. */
export function usePatch(): { canAsk: boolean; ask: (prompt: string) => void } {
  const { widgets, open } = useProjectDock();
  const canAsk = widgets.some((widget) => widget.id === ASSISTANT_DOCK_WIDGET_ID);
  const ask = useCallback((prompt: string) => open(ASSISTANT_DOCK_WIDGET_ID, { prompt }), [open]);
  return { canAsk, ask };
}
