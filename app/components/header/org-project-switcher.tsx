import { OrganizationSwitcher } from './org-switcher';
import { ProjectSwitcher } from './project-switcher';
import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';

export interface OrgProjectSwitcherProps {
  currentOrg?: Organization;
  currentProject?: Project;
  /** Optional class name for the project switcher chevron icon */
  projectSwitcherChevronClassName?: string;
  /** Show loading skeletons to prevent layout shift */
  switcherLoading?: boolean;
}

const OrgSkeleton = () => (
  <div className="flex items-center gap-2.5" aria-hidden>
    <Skeleton className="h-4 w-3.5 shrink-0 rounded" />
    <Skeleton className="h-4 w-40 sm:w-52" />
    <Skeleton className="h-4 w-4 shrink-0 rounded" />
  </div>
);

const ProjectSkeleton = () => (
  <div className="flex items-center gap-2.5 pl-2.5" aria-hidden>
    <Skeleton className="h-4 w-4 shrink-0 rounded" />
    <Skeleton className="h-4 w-40" />
    <Skeleton className="h-4 w-4 shrink-0 rounded" />
  </div>
);

const SeparatorIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
    aria-hidden>
    <path
      opacity="0.1"
      className="stroke-foreground"
      d="M9.96004 1.31641L4.04004 12.6837"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const OrgProjectSwitcher = ({
  currentOrg,
  currentProject,
  projectSwitcherChevronClassName = 'w-4 h-4',
  switcherLoading = false,
}: OrgProjectSwitcherProps) => {
  const orgReady = currentOrg && (currentOrg.displayName || currentOrg.name);
  const showOrg = orgReady || switcherLoading;
  const showProject = currentProject || switcherLoading;
  const showProjectSkeleton = !orgReady || (!currentProject && switcherLoading);

  if (!showOrg && !showProject) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {!orgReady ? <OrgSkeleton /> : <OrganizationSwitcher currentOrg={currentOrg!} />}
      {showProject && (
        <>
          <SeparatorIcon />
          {showProjectSkeleton ? (
            <ProjectSkeleton />
          ) : (
            currentProject && (
              <ProjectSwitcher
                currentProject={currentProject}
                chevronClassName={projectSwitcherChevronClassName}
              />
            )
          )}
        </>
      )}
    </div>
  );
};
