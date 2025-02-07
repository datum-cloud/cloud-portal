import { Link } from 'react-router'
import { routes } from '@/constants/routes'
import { Logo } from '@/components/logo/logo'

import { UserDropdown } from '@/components/header/user-dropdown'
import { Button } from '@/components/ui/button'
import { ProjectSwitcher } from './project-switcher'
import { HelpCircleIcon, InboxIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/hooks/useTheme'

export const Header = ({
  hideProjectSwitcher = true,
}: {
  hideProjectSwitcher?: boolean
}) => {
  const theme = useTheme()

  return (
    <header className="sticky top-0 z-50 flex items-center border-b bg-card px-4">
      <div className="flex w-full items-center justify-between py-1">
        {/* Left Section */}
        <div className="flex items-center justify-start gap-4">
          <Link to={routes.home}>
            <Logo asIcon={false} width={100} theme={theme} />
          </Link>
          {!hideProjectSwitcher && <ProjectSwitcher />}
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
