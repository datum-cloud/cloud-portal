import { UserDropdown } from '@/layouts/dashboard/header/user-dropdown'
import { Button } from '@/components/ui/button'
import { LifeBuoyIcon } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Logo } from '@/components/logo/logo'
import { useTheme } from '@/hooks/useTheme'

export const Header = ({ content }: { content: React.ReactNode }) => {
  const theme = useTheme()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b">
      {/* Left Section */}
      <div className="flex items-center px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        {content ? content : <Logo asIcon={false} width={80} theme={theme} />}
      </div>
      {/* Right Section */}
      <div className="flex items-center justify-end pr-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="mr-1 h-7">
            <LifeBuoyIcon className="size-4" />
            Feedback
          </Button>
          {/* <Tooltip>
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
          </Tooltip> */}
        </div>

        <Separator orientation="vertical" className="ml-3 mr-2 h-6" />
        <UserDropdown />
      </div>
    </header>
  )
}
