import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { getInitials } from '@/utils/misc'
import { ChevronsUpDown, Loader2, Plus } from 'lucide-react'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { useEffect } from 'react'
import { useFetcher, useNavigate } from 'react-router'
import { ROUTE_PATH as PROJECT_LIST_PATH } from '@/routes/api+/projects+/list'
import { routes } from '@/constants/routes'

const ProjectItem = ({ project }: { project: IProjectControlResponse }) => {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-7 rounded-lg">
        {/* <AvatarImage src={currentOrg?.avatarRemoteURL} alt={currentOrg?.name} /> */}
        <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
          {getInitials(project.description)}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">{project.description}</span>
        <span className="truncate text-xs">{project.name}</span>
      </div>
    </div>
  )
}

export const ProjectSwitcher = ({
  currentProject,
}: {
  currentProject: IProjectControlResponse
}) => {
  const fetcher = useFetcher({ key: 'project-list' })
  const navigate = useNavigate()

  useEffect(() => {
    fetcher.load(PROJECT_LIST_PATH)
  }, [])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="focus-visible:ring-0 data-[state=open]:bg-sidebar-accent data-[state=open]:font-semibold data-[state=open]:text-sidebar-accent-foreground">
              <ProjectItem project={currentProject} />
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
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
                {fetcher.data?.map((project: IProjectControlResponse) => (
                  <DropdownMenuItem
                    key={project.name}
                    className="gap-2 p-2"
                    onClick={() => {
                      navigate(routes.projects.detail(project.name))
                    }}>
                    <ProjectItem project={project} />
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onClick={() => {
                    navigate(routes.projects.new)
                  }}>
                  <Plus className="size-4" />
                  <div className="font-medium text-muted-foreground">New project</div>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
