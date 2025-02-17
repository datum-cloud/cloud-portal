import { UserDropdown } from '@/layouts/dashboard/header/user-dropdown'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Link, useParams } from 'react-router'
import SearchBar from './search-bar'
import { OrganizationSwitcher } from './org-switcher'
import { ProjectSwitcher } from './project-switcher'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { SlashIcon, CircleHelp } from 'lucide-react'

export const Header = ({
  noSidebar = false,
  currentProject,
}: {
  noSidebar?: boolean
  currentProject?: IProjectControlResponse
}) => {
  const params = useParams<{ orgId: string; projectId: string }>()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b">
      {/* Left Section */}
      <div className="flex flex-1 items-center px-4">
        {!noSidebar && (
          <>
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-4" />
          </>
        )}
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
          <Link to="https://docs.datum.net/" target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm">
              <CircleHelp />
            </Button>
          </Link>
        </div>

        <Separator orientation="vertical" className="h-full" />
        <UserDropdown />
      </div>
    </header>
  )
}
