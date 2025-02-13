import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { ChevronsUpDown, Loader2, Plus } from 'lucide-react'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { useFetcher, useNavigate } from 'react-router'
import { ROUTE_PATH as PROJECT_LIST_PATH } from '@/routes/api+/projects+/list'
import { routes } from '@/constants/routes'
import { getPathWithParams } from '@/utils/path'
const ProjectItem = ({ project }: { project: IProjectControlResponse }) => {
  return (
    <div className="flex items-center gap-2">
      {/* <Avatar className="size-7 rounded-lg">
        <AvatarImage src={project.avatarRemoteURL} alt={project.name} />
        <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
          {getInitials(project.description)}
        </AvatarFallback>
      </Avatar> */}
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">{project?.description}</span>
        <span className="truncate text-xs">{project?.name}</span>
      </div>
    </div>
  )
}

export const ProjectSwitcher = ({
  currentProject,
  orgId,
}: {
  currentProject: IProjectControlResponse
  orgId: string
}) => {
  const fetcher = useFetcher({ key: 'project-list' })
  const navigate = useNavigate()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) {
              fetcher.load(PROJECT_LIST_PATH)
            }
          }}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="focus-visible:ring-0 data-[state=open]:bg-sidebar-accent data-[state=open]:font-semibold data-[state=open]:text-sidebar-accent-foreground">
              <ProjectItem project={currentProject} />
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 overflow-y-auto rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Choose Project
            </DropdownMenuLabel>

            {fetcher.state === 'loading' ? (
              <DropdownMenuItem disabled>
                <Loader2 className="size-4 animate-spin" />
                <span>Loading projects...</span>
              </DropdownMenuItem>
            ) : (
              <>
                <div className="max-h-[300px] overflow-y-auto">
                  {fetcher.data
                    ?.filter(
                      (project: IProjectControlResponse) =>
                        project.name !== currentProject.name,
                    )
                    .map((project: IProjectControlResponse) => (
                      <DropdownMenuItem
                        key={project.name}
                        className="gap-2 p-2"
                        onClick={() => {
                          navigate(
                            getPathWithParams(routes.projects.detail, {
                              orgId,
                              projectId: project.name,
                            }),
                          )
                        }}>
                        <ProjectItem project={project} />
                      </DropdownMenuItem>
                    ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onClick={() => {
                    navigate(getPathWithParams(routes.projects.new, { orgId }))
                  }}>
                  <Plus className="size-4 text-muted-foreground" />
                  <div className="cursor-pointer font-medium text-muted-foreground">
                    New project
                  </div>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
