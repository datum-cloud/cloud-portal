import { useProjectDock } from './project-dock-context';
import { resolvePluginIcon } from '@/modules/plugins/client/icon-map';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';

/**
 * Header icon buttons for `portal.dock/project` plugin widgets (e.g. Patch
 * AI). Each widget gets a toggle button next to the built-in help/docs/task
 * icons; clicking one opens it in the docked {@link ProjectDockPanel}.
 */
export function ProjectDockTriggers() {
  const { widgets, activeWidgetId, toggle } = useProjectDock();

  return widgets.map((widget) => (
    <Tooltip key={widget.id} message={widget.title} side="bottom">
      <Button
        type="quaternary"
        theme="borderless"
        size="small"
        onClick={() => toggle(widget.id)}
        aria-label={widget.title}
        aria-pressed={activeWidgetId === widget.id}
        className={cn(
          'h-7 w-7 rounded-lg p-0',
          activeWidgetId === widget.id ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent'
        )}>
        <Icon icon={resolvePluginIcon(widget.icon)} className="text-icon-header size-4" />
      </Button>
    </Tooltip>
  ));
}
