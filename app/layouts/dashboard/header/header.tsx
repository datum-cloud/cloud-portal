import { UserDropdown } from '@/layouts/dashboard/header/user-dropdown'
import { Button } from '@/components/ui/button'
import { LibraryIcon, LifeBuoyIcon } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Link } from 'react-router'
import SearchBar from './search-bar'
export const Header = ({
  noSidebar = false,
  content,
}: {
  noSidebar?: boolean
  content?: React.ReactNode
}) => {
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
        {content}
      </div>
      {/* Right Section */}
      <div className="flex h-9 flex-1 items-center justify-end gap-3 pr-4">
        <SearchBar />
        <div className="flex h-full items-center gap-2">
          <Link to="https://docs.datum.net/" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="px-2">
              Docs
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="px-2">
            Feedback
          </Button>
        </div>

        <Separator orientation="vertical" className="h-full" />
        <UserDropdown />
      </div>
    </header>
  )
}
