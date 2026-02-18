import { OrganizationSwitcher } from './org-switcher';
import { ProjectSwitcher } from './project-switcher';
import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';

export interface OrgProjectSwitcherProps {
  currentOrg?: Organization;
  currentProject?: Project;
  /** Optional class name for the project switcher trigger */
  projectSwitcherTriggerClassName?: string;
}

export const OrgProjectSwitcher = ({
  currentOrg,
  currentProject,
  projectSwitcherTriggerClassName = 'w-4 h-4',
}: OrgProjectSwitcherProps) => {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {currentOrg && <OrganizationSwitcher currentOrg={currentOrg} />}
      {currentProject && (
        <>
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
          <ProjectSwitcher
            currentProject={currentProject}
            triggerClassName={projectSwitcherTriggerClassName}
          />
        </>
      )}
    </div>
  );
};
