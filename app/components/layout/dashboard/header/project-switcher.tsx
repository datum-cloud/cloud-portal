import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { routes } from '@/constants/paths';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { ROUTE_PATH as PROJECT_LIST_PATH } from '@/routes/api+/projects+/list';
import { cn } from '@/utils/misc';
import { getPathWithParams } from '@/utils/path';
import { CheckIcon, ChevronsUpDownIcon, Loader2, PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useFetcher, useNavigate } from 'react-router';

const ProjectItem = ({ project }: { project: IProjectControlResponse }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="cursor-pointer truncate font-semibold">{project?.description}</span>
      </div>
    </div>
  );
};

export const ProjectSwitcher = ({
  currentProject,
  orgId,
  triggerClassName,
}: {
  currentProject: IProjectControlResponse;
  orgId: string;
  triggerClassName?: string;
}) => {
  const navigate = useNavigate();
  const fetcher = useFetcher({ key: 'project-list' });
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const onSelect = (project: IProjectControlResponse) => {
    navigate(getPathWithParams(routes.projects.dashboard, { orgId, projectId: project.name }));
  };

  useEffect(() => {
    if (open && !loaded) {
      fetcher.load(PROJECT_LIST_PATH);
      setLoaded(true);
    }
  }, [open, loaded]);

  useEffect(() => {
    return () => {
      setLoaded(false);
    };
  }, []);

  return (
    <div className="flex items-center gap-1 pl-2">
      <Link
        to={getPathWithParams(routes.projects.detail, {
          orgId,
          projectId: currentProject.name,
        })}
        className="flex w-fit max-w-[300px] items-center truncate text-left text-sm leading-tight font-semibold">
        {currentProject?.description}
      </Link>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild className="w-full">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'data-[state=open]:bg-primary/5 flex h-7 w-fit gap-2 border-none p-0 px-2',
              triggerClassName
            )}>
            <ChevronsUpDownIcon className="text-primary/60 size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="popover-content-width-full min-w-[300px] p-0" align="center">
          <Command>
            <CommandInput
              className="h-9 rounded-md border-none focus-visible:ring-0"
              placeholder="Find project..."
            />
            <CommandList className="max-h-none">
              <CommandEmpty>No results found.</CommandEmpty>
              {fetcher.state === 'loading' && (
                <CommandItem disabled>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Loading projects...</span>
                </CommandItem>
              )}
              {fetcher.data?.length > 0 && (
                <CommandGroup className="max-h-[300px] overflow-y-auto">
                  {(fetcher.data ?? [])
                    .sort((a: IProjectControlResponse, b: IProjectControlResponse) =>
                      (a?.description ?? '').localeCompare(b?.description ?? '')
                    )
                    .map((project: IProjectControlResponse) => {
                      const isSelected = project.uid === currentProject.uid;
                      return (
                        <CommandItem
                          value={`${project.name}-${project.description}`}
                          key={project.uid}
                          onSelect={() => {
                            setOpen(false);
                            if (!isSelected) {
                              onSelect(project);
                            }
                          }}
                          className="cursor-pointer justify-between">
                          <ProjectItem project={project} />
                          {isSelected && <CheckIcon className="text-primary size-4" />}
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              )}

              <CommandSeparator />
              <CommandItem asChild className="cursor-pointer">
                <Link
                  to={getPathWithParams(routes.org.projects.new, { orgId })}
                  className="flex items-center gap-2 px-3">
                  <PlusIcon className="size-4" />
                  <span>Create project</span>
                </Link>
              </CommandItem>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
