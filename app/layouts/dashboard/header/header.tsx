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
        <SearchBar />
      </div>
      {/* Right Section */}
      <div className="flex items-center justify-end pr-4">
        <div className="flex items-center gap-3">
          <Link to="https://docs.datum.net/" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="h-7">
              <LibraryIcon className="size-4" />
              <span className="hidden sm:flex">Docs</span>
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="mr-1 h-7">
            <LifeBuoyIcon className="size-4" />
            <span className="hidden sm:flex">Feedback</span>
          </Button>
        </div>

        <Separator orientation="vertical" className="ml-3 mr-2 h-6" />
        <UserDropdown />
      </div>
    </header>
  )
}
