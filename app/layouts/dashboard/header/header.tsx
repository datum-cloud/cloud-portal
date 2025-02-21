import { UserDropdown } from '@/layouts/dashboard/header/user-dropdown'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Link, useParams } from 'react-router'
import SearchBar from './search-bar'
import { OrganizationSwitcher } from './org-switcher'
import { ProjectSwitcher } from './project-switcher'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { SlashIcon, CircleHelp } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export const Header = ({
  hideSidebar = false,
  currentProject,
}: {
  hideSidebar?: boolean
  currentProject?: IProjectControlResponse
}) => {
  const params = useParams<{ orgId: string; projectId: string }>()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background">
      {/* Left Section */}
      <div className="flex flex-1 items-center px-4">
        {!hideSidebar && <SidebarTrigger className="-ml-1" />}
        {params?.orgId && <OrganizationSwitcher />}
        {params?.projectId && currentProject && (
          <>
            <SlashIcon className="mx-2 text-primary/20" />
            <ProjectSwitcher currentProject={currentProject} orgId={params.orgId ?? ''} />
          </>
        )}
      </div>
      {/* Right Section */}
      <div className="flex h-9 flex-1 items-center justify-end gap-3 pr-4">
        <SearchBar />
        <div className="flex h-full items-center gap-2">
          <Button variant="outline" size="sm" className="px-2">
            Feedback
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="https://docs.datum.net/" target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm">
                  <CircleHelp />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>Docs</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <UserDropdown />
      </div>
    </header>
  )
}
