import { useApp } from '@/providers/app.provider';
import type { Project } from '@/resources/projects';
import { useProjects } from '@/resources/projects/project.queries';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, SpinnerIcon } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@shadcn/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { CheckIcon, ChevronDown, FolderRoot } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

const ProjectItem = ({ project }: { project: Project }) => {
  return (
    <div className="flex w-full items-center gap-3">
      <span className="truncate text-xs font-medium">{project?.displayName}</span>
    </div>
  );
};

export const ProjectSwitcher = ({
  currentProject,
  triggerClassName,
}: {
  currentProject: Project;
  triggerClassName?: string;
}) => {
  const { orgId } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useProjects(orgId ?? '', undefined, {
    enabled: open && !!orgId,
  });

  const onSelect = (project: Project) => {
    navigate(getPathWithParams(paths.project.detail.home, { projectId: project.name }));
  };

  const projects: Project[] = useMemo(() => {
    return data?.items ?? [];
  }, [data]);

  return (
    <div className="flex items-center gap-2.5 pl-2.5">
      <Link
        to={getPathWithParams(paths.project.detail.home, {
          projectId: currentProject.name,
        })}
        className="flex w-fit items-center justify-between gap-2.5 text-left">
        <Icon icon={FolderRoot} className="text-icon-primary h-3.5 w-fit" />
        <span className="truncate text-xs leading-3.5 sm:max-w-36 md:max-w-none">
          {currentProject?.displayName}
        </span>
      </Link>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="quaternary"
            theme="borderless"
            size="small"
            className={cn(
              'flex cursor-pointer gap-2 border-none p-0 hover:bg-transparent active:bg-transparent data-[state=open]:bg-transparent',
              triggerClassName
            )}>
            <Icon
              icon={ChevronDown}
              className={cn(
                'text-icon-secondary size-4 w-fit transition-all',
                open && 'rotate-180'
              )}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="popover-content-width-full border-input min-w-[220px] rounded-lg p-0"
          align="center">
          <Command className="rounded-lg">
            <CommandInput
              className="placeholder:text-secondary/60 h-7 border-none text-xs placeholder:text-xs focus-visible:ring-0"
              iconClassName="text-secondary size-3.5"
              wrapperClassName="px-3 py-2"
              placeholder="Find project"
            />
            <CommandList className="max-h-none">
              <CommandEmpty>No results found.</CommandEmpty>
              {isLoading && projects.length === 0 ? (
                <CommandItem disabled className="px-4 py-2.5">
                  <div className="flex items-center justify-center">
                    <SpinnerIcon size="xs" aria-hidden="true" />
                  </div>
                  <span className="text-xs">Loading</span>
                </CommandItem>
              ) : (
                <CommandGroup className="max-h-[300px] overflow-y-auto px-0 py-0">
                  {(projects ?? [])
                    .sort((a: Project, b: Project) =>
                      (a?.displayName ?? '').localeCompare(b?.displayName ?? '')
                    )
                    .map((project: Project) => {
                      const isSelected = project.uid === currentProject.uid;
                      return (
                        <CommandItem
                          value={`${project.name}-${project.displayName}`}
                          key={project.uid}
                          onSelect={() => {
                            setOpen(false);
                            if (!isSelected) {
                              onSelect(project);
                            }
                          }}
                          className="cursor-pointer justify-between px-3 py-2">
                          <ProjectItem project={project} />
                          {isSelected && <Icon icon={CheckIcon} className="text-primary size-4" />}
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              )}

              <CommandSeparator />
              <CommandItem asChild className="cursor-pointer">
                <Link
                  to={getPathWithParams(
                    paths.org.detail.projects.root,
                    { orgId },
                    { action: 'create' }
                  )}
                  className="flex items-center gap-2 px-3 py-2">
                  <Icon icon={FolderRoot} className="size-3.5" />
                  <span className="text-xs">Create project</span>
                </Link>
              </CommandItem>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
