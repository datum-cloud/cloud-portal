import { Link } from '@remix-run/react'
import { routes } from '@/constants/routes'
import { Logo } from '@/components/logo/logo.component'

import { UserDropdown } from '@/components/header/user-dropdown.component'
import { Button } from '@/components/ui/button'
import { ProjectSwitcher } from './project-switcher.component'
import { HelpCircleIcon, InboxIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
export const Header = () => {
  return (
    <header className="sticky top-0 z-50 flex items-center border-b bg-card px-4">
      <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between py-1">
        {/* Left Section */}
        <div className="flex items-center justify-start gap-4">
          <Link to={routes.home}>
            <Logo asIcon={false} width={100} />
          </Link>
          <ProjectSwitcher />
        </div>

        {/* Right Section */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="mr-1 h-7">
              Feedback
            </Button>
            <Tooltip>
              <TooltipTrigger>
                <InboxIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Notifications</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircleIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Help</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="ml-3 mr-2 h-6" />
          <UserDropdown />
        </div>
      </div>
    </header>
  )
}
