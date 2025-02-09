import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { getInitials } from '@/utils/misc'
import { ChevronsUpDown, Plus } from 'lucide-react'
import { useState } from 'react'

const projects = [
  {
    id: '1',
    description: 'My Project',
    name: 'my-project-123',
  },
  {
    id: '2',
    description: 'My Project 2',
    name: 'my-project-456',
  },
]

export const ProjectSwitcher = () => {
  const { isMobile } = useSidebar()
  const [activeProject, setActiveProject] = useState(projects[0])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="size-8 rounded-lg">
                {/* <AvatarImage src={currentOrg?.avatarRemoteURL} alt={currentOrg?.name} /> */}
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                  {getInitials(activeProject.description)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeProject.description}
                </span>
                <span className="truncate text-xs">{activeProject.name}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Choose Project
            </DropdownMenuLabel>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.name}
                onClick={() => setActiveProject(project)}
                className="gap-2 p-2">
                <Avatar className="size-8 rounded-lg">
                  {/* <AvatarImage src={currentOrg?.avatarRemoteURL} alt={currentOrg?.name} /> */}
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                    {getInitials(project.description)}
                  </AvatarFallback>
                </Avatar>
                {project.description}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <Plus className="size-4" />
              <div className="font-medium text-muted-foreground">New project</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
