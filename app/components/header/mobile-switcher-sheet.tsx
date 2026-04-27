import { OrganizationItem } from '@/components/select-organization/organization-item';
import { useApp } from '@/providers/app.provider';
import { type Organization, useOrganizationsGql } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import { useProjects } from '@/resources/projects/project.queries';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@datum-cloud/datum-ui/command';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { MobileSheet } from '@datum-cloud/datum-ui/mobile-sheet';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Building, CheckIcon, ChevronDown, FolderRoot, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

// ---------------------------------------------------------------------------
// Org Switcher Sheet
// ---------------------------------------------------------------------------

function OrgSwitcherSheet({
  open,
  onOpenChange,
  currentOrg,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentOrg?: Organization;
}) {
  const { setOrganization } = useApp();
  const navigate = useNavigate();
  const { data, isLoading } = useOrganizationsGql(undefined, { enabled: open });

  const organizations = useMemo(() => {
    const items = [...(data?.items ?? [])];
    return items.sort((a, b) => {
      if (a.name === currentOrg?.name) return -1;
      if (b.name === currentOrg?.name) return 1;
      return (a.displayName ?? a.name ?? '').localeCompare(b.displayName ?? b.name ?? '');
    });
  }, [data, currentOrg?.name]);

  const handleSelect = useCallback(
    (org: Organization) => {
      onOpenChange(false);
      if (org.name !== currentOrg?.name) {
        setOrganization(org);
        navigate(getPathWithParams(paths.org.detail.projects.root, { orgId: org.name }));
      }
    },
    [currentOrg?.name, setOrganization, navigate, onOpenChange]
  );

  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Switch organization"
      description="Select an organization"
      footer={
        <div className="flex items-center gap-4">
          {currentOrg?.name && (
            <Link
              to={getPathWithParams(paths.org.detail.settings.general, { orgId: currentOrg.name })}
              className="flex items-center gap-2 text-xs font-medium">
              <Icon icon={Settings2} className="size-3.5" />
              Settings
            </Link>
          )}
          <Link
            to={paths.account.organizations.root}
            className="flex items-center gap-2 text-xs font-medium">
            <Icon icon={Building} className="size-3.5" />
            All organizations
          </Link>
        </div>
      }>
      <Command className="rounded-none border-none">
        <CommandInput
          className="placeholder:text-secondary/60 h-8 border-none text-xs placeholder:text-xs focus-visible:ring-0"
          iconClassName="text-secondary size-3.5"
          wrapperClassName="px-3 py-1.5"
          placeholder="Find organization"
          disabled={isLoading}
        />
        <CommandList className="max-h-[50svh]">
          <CommandEmpty className="py-3 text-center text-xs">No organizations found.</CommandEmpty>
          {isLoading && organizations.length === 0 ? (
            <CommandItem disabled className="px-4 py-2.5">
              <div className="flex items-center justify-center">
                <SpinnerIcon size="xs" aria-hidden="true" />
              </div>
              <span className="text-xs">Loading...</span>
            </CommandItem>
          ) : (
            <CommandGroup className="px-0 py-0">
              {organizations.map((org) => {
                const isSelected = org.name === currentOrg?.name;
                return (
                  <CommandItem
                    value={org.name}
                    key={org.name}
                    onSelect={() => handleSelect(org)}
                    className="cursor-pointer justify-between px-3 py-2.5">
                    <OrganizationItem org={org} />
                    {isSelected && <Icon icon={CheckIcon} className="text-primary size-4" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </MobileSheet>
  );
}

// ---------------------------------------------------------------------------
// Project Switcher Sheet
// ---------------------------------------------------------------------------

function ProjectSwitcherSheet({
  open,
  onOpenChange,
  currentProject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProject?: Project;
}) {
  const { orgId } = useApp();
  const navigate = useNavigate();
  const { data, isLoading } = useProjects(orgId ?? '', undefined, { enabled: open && !!orgId });

  const projects = useMemo(() => {
    const items = data?.items ?? [];
    return [...items].sort((a, b) => {
      if (a.uid === currentProject?.uid) return -1;
      if (b.uid === currentProject?.uid) return 1;
      return (a.displayName ?? '').localeCompare(b.displayName ?? '');
    });
  }, [data, currentProject?.uid]);

  const handleSelect = useCallback(
    (project: Project) => {
      onOpenChange(false);
      if (project.uid !== currentProject?.uid) {
        navigate(getPathWithParams(paths.project.detail.home, { projectId: project.name }));
      }
    },
    [currentProject?.uid, navigate, onOpenChange]
  );

  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Switch project"
      description="Select a project"
      footer={
        <Link
          to={getPathWithParams(paths.org.detail.projects.root, { orgId }, { action: 'create' })}
          className="flex items-center gap-2 text-xs font-medium">
          <Icon icon={FolderRoot} className="size-3.5" />
          Create project
        </Link>
      }>
      <Command className="rounded-none border-none">
        <CommandInput
          className="placeholder:text-secondary/60 h-8 border-none text-xs placeholder:text-xs focus-visible:ring-0"
          iconClassName="text-secondary size-3.5"
          wrapperClassName="px-3 py-1.5"
          placeholder="Find project"
          disabled={isLoading}
        />
        <CommandList className="max-h-[50svh]">
          <CommandEmpty className="py-3 text-center text-xs">No projects found.</CommandEmpty>
          {isLoading && projects.length === 0 ? (
            <CommandItem disabled className="px-4 py-2.5">
              <div className="flex items-center justify-center">
                <SpinnerIcon size="xs" aria-hidden="true" />
              </div>
              <span className="text-xs">Loading...</span>
            </CommandItem>
          ) : (
            <CommandGroup className="px-0 py-0">
              {projects.map((project) => {
                const isSelected = project.uid === currentProject?.uid;
                return (
                  <CommandItem
                    value={`${project.name}-${project.displayName}`}
                    key={project.uid}
                    onSelect={() => handleSelect(project)}
                    className="cursor-pointer justify-between px-3 py-2.5">
                    <span className="truncate text-xs font-medium">{project.displayName}</span>
                    {isSelected && <Icon icon={CheckIcon} className="text-primary size-4" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </MobileSheet>
  );
}

// ---------------------------------------------------------------------------
// Sub-bar (rendered below the header on mobile)
// ---------------------------------------------------------------------------

const SwitcherRowSkeleton = () => (
  <div className="flex min-h-[36px] w-full items-center gap-2 px-4 py-1.5" aria-hidden>
    <Skeleton className="size-3.5 shrink-0 rounded" />
    <Skeleton className="h-3.5 w-32" />
    <Skeleton className="ml-auto size-3.5 shrink-0 rounded" />
  </div>
);

export function MobileSwitcherBar({
  currentOrg,
  currentProject,
  switcherLoading = false,
}: {
  currentOrg?: Organization;
  currentProject?: Project;
  switcherLoading?: boolean;
}) {
  const [orgSheetOpen, setOrgSheetOpen] = useState(false);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const hasEverShown = useRef(false);

  const orgName = currentOrg?.displayName ?? currentOrg?.name;
  const orgReady = !!orgName;

  useEffect(() => {
    if (orgReady) {
      hasEverShown.current = true;
    }
  }, [orgReady]);

  // Show skeleton during loading or transitional gaps (org was shown before but data is re-fetching)
  const showSkeleton = !orgReady && (switcherLoading || hasEverShown.current);

  // Hide completely only on pages that genuinely have no org context
  if (!orgReady && !showSkeleton) return null;

  return (
    <>
      <div className="bg-background border-sidebar-border flex flex-col border-b md:hidden">
        {/* Org row */}
        {!orgReady ? (
          <SwitcherRowSkeleton />
        ) : (
          <button
            type="button"
            onClick={() => setOrgSheetOpen(true)}
            className="flex min-h-[36px] w-full items-center gap-2 px-4 py-1.5"
            aria-label="Switch organization">
            <Icon icon={Building} className="text-muted-foreground size-3.5 shrink-0" />
            <span className="text-foreground truncate text-xs font-medium">{orgName}</span>
            <Icon icon={ChevronDown} className="text-muted-foreground ml-auto size-3.5 shrink-0" />
          </button>
        )}

        {/* Project row */}
        {switcherLoading && !currentProject ? (
          <div className="border-sidebar-border border-t">
            <SwitcherRowSkeleton />
          </div>
        ) : (
          currentProject && (
            <button
              type="button"
              onClick={() => setProjectSheetOpen(true)}
              className="border-sidebar-border flex min-h-[36px] w-full items-center gap-2 border-t px-4 py-1.5"
              aria-label="Switch project">
              <Icon icon={FolderRoot} className="text-muted-foreground size-3.5 shrink-0" />
              <span className="text-foreground truncate text-xs font-medium">
                {currentProject.displayName}
              </span>
              <Icon
                icon={ChevronDown}
                className="text-muted-foreground ml-auto size-3.5 shrink-0"
              />
            </button>
          )
        )}
      </div>

      <OrgSwitcherSheet
        open={orgSheetOpen}
        onOpenChange={setOrgSheetOpen}
        currentOrg={currentOrg}
      />

      {currentProject && (
        <ProjectSwitcherSheet
          open={projectSheetOpen}
          onOpenChange={setProjectSheetOpen}
          currentProject={currentProject}
        />
      )}
    </>
  );
}
