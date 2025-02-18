import { Loader2, ChevronsUpDownIcon, PlusIcon, CheckIcon } from 'lucide-react'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { useFetcher, useNavigate, Link } from 'react-router'
import { cn } from '@/utils/misc'
import { PopoverContent, PopoverTrigger, Popover } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandItem,
  CommandEmpty,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandSeparator,
} from '@/components/ui/command'
import { useState, useEffect } from 'react'
import { getPathWithParams } from '@/utils/path'
import { routes } from '@/constants/routes'
import { ROUTE_PATH as PROJECT_LIST_PATH } from '@/routes/api+/projects+/list'

const ProjectItem = ({ project }: { project: IProjectControlResponse }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="cursor-pointer truncate font-semibold">
          {project?.description}
        </span>
      </div>
    </div>
  )
}

export const ProjectSwitcher = ({
  currentProject,
  orgId,
  triggerClassName,
}: {
  currentProject: IProjectControlResponse
  orgId: string
  triggerClassName?: string
}) => {
  const navigate = useNavigate()
  const fetcher = useFetcher({ key: 'project-list' })
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const onSelect = (project: IProjectControlResponse) => {
    navigate(
      getPathWithParams(routes.projects.dashboard, { orgId, projectId: project.name }),
    )
  }

  useEffect(() => {
    if (open && !loaded) {
      fetcher.load(PROJECT_LIST_PATH)
      setLoaded(true)
    }
  }, [open, loaded])

  useEffect(() => {
    return () => {
      setLoaded(false)
    }
  }, [])

  return (
    <div className="flex items-center gap-1 pl-2">
      <Link
        to={getPathWithParams(routes.projects.detail, {
          orgId,
          projectId: currentProject.name,
        })}
        className="flex w-fit max-w-[300px] items-center truncate text-left text-sm font-semibold leading-tight">
        {currentProject?.description}
      </Link>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild className="w-full">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'flex h-7 w-fit gap-2 border-none p-0 px-2 data-[state=open]:bg-primary/5',
              triggerClassName,
            )}>
            <ChevronsUpDownIcon className="size-4 text-primary/60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="popover-content-width-full min-w-[300px] p-0"
          align="center">
          <Command>
            <CommandInput
              className="h-9 rounded-md border-none focus-visible:ring-0"
              placeholder="Find Project..."
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
                      a.description.localeCompare(b.description),
                    )
                    .map((project: IProjectControlResponse) => {
                      const isSelected = project.uid === currentProject.uid
                      return (
                        <CommandItem
                          value={`${project.name}-${project.description}`}
                          key={project.uid}
                          onSelect={() => {
                            setOpen(false)
                            if (!isSelected) {
                              onSelect(project)
                            }
                          }}
                          className="justify-between">
                          <ProjectItem project={project} />
                          {isSelected && <CheckIcon className="size-4 text-primary" />}
                        </CommandItem>
                      )
                    })}
                </CommandGroup>
              )}

              <CommandSeparator />
              <CommandItem>
                <Link
                  to={getPathWithParams(routes.projects.new, { orgId })}
                  className="flex items-center gap-2">
                  <PlusIcon className="size-4" />
                  <span>Create Project</span>
                </Link>
              </CommandItem>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
