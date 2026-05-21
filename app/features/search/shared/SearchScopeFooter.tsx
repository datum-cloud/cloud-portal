import type { ActiveProject } from '@/resources/search/search.active-project';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { InfoIcon } from 'lucide-react';

interface Props {
  project: ActiveProject | null;
  /**
   * When true (the user has typed a query and the server returned hits),
   * the footer reframes the message as a confirmation of scope:
   *   "Showing resource results for [Project] only."
   * When false (empty state, recents, or zero hits), the footer states
   * the current scope as ongoing context:
   *   "Searching in [Project]"
   */
  hasResults?: boolean;
}

/**
 * Sticky footer inside every search surface that tells the user
 * which project they're searching inside. Renders nothing when the
 * project is null (search is in its inactive state and the surface
 * is showing its own empty-state message instead).
 */
export function SearchScopeFooter({ project, hasResults = false }: Props) {
  if (!project) return null;

  const projectName = <span className="text-foreground font-medium">{project.displayName}</span>;

  return (
    <div
      role="status"
      aria-label={
        hasResults
          ? `Showing resource results for project ${project.displayName} only`
          : `Searching in project ${project.displayName}`
      }
      className="text-muted-foreground flex items-center gap-2 border-t px-3 py-2 text-xs">
      {/*<KindIcon kind="Project" className="size-3.5 shrink-0 opacity-70" />*/}
      <span className="truncate">
        {hasResults ? (
          <>Showing resource results for {projectName} only.</>
        ) : (
          <>Searching in {projectName}</>
        )}
      </span>
      <Tooltip message="Resource searching is limited to the current project for most resources types (e.g. Domains and DNS)">
        <Icon icon={InfoIcon} size={13} aria-hidden />
      </Tooltip>
    </div>
  );
}
