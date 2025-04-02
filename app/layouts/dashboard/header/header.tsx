import { OrganizationSwitcher } from './org-switcher'
import { ProjectSwitcher } from './project-switcher'
import SearchBar from './search-bar'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { UserDropdown } from '@/layouts/dashboard/header/user-dropdown'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { CircleHelp, SlashIcon } from 'lucide-react'
import { Link, useParams } from 'react-router'

export const Header = ({
  hideSidebar = false,
  currentProject,
}: {
  hideSidebar?: boolean
  currentProject?: IProjectControlResponse
}) => {
  const params = useParams<{ orgId: string; projectId: string }>()

  return (
    <header className="bg-background sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 border-b">
      {/* Left Section */}
      <div className="flex flex-1 items-center px-4">
        {!hideSidebar && <SidebarTrigger className="-ml-1 cursor-pointer" />}
        {params?.orgId && <OrganizationSwitcher />}
        {params?.projectId && currentProject && (
          <>
            <SlashIcon size={14} className="text-primary/20 mx-1" />
            <ProjectSwitcher currentProject={currentProject} orgId={params.orgId ?? ''} />
          </>
        )}
      </div>
      {/* Right Section */}
      <div className="flex h-9 flex-1 items-center justify-end gap-3 pr-4">
        <SearchBar />
        <div className="flex h-full items-center gap-2">
          <Button variant="outline" size="sm" className="cursor-pointer px-2">
            Feedback
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="https://docs.datum.net/" target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm" className="cursor-pointer">
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
