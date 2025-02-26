import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { routes } from '@/constants/routes'
import { useOs } from '@/hooks/useOs'
import { cn } from '@/utils/misc'
import { getPathWithParams } from '@/utils/path'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

export default function SearchBar({ className }: { className?: string }) {
  const { orgId } = useParams()
  const os = useOs()

  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <>
      <Button
        type="button"
        aria-label="Search"
        variant="outline"
        size="sm"
        className={cn('h-9 w-full max-w-64 cursor-text justify-between px-2', className)}
        onClick={() => setOpen(true)}>
        <div className="flex items-center gap-2 [&>svg]:opacity-50">
          <Search size={18} />
          <span className="placeholder:text-text inline-flex text-sm text-gray-600 group-hover:text-gray-900">
            Search...
          </span>
        </div>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-sm font-medium text-muted-foreground opacity-100 sm:inline-flex">
          <span>{os === 'macos' ? '⌘' : 'ctrl'}</span> + <span>/</span>
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            {orgId && (
              <>
                <CommandItem asChild>
                  <Link to={getPathWithParams(routes.org.projects.root, { orgId })}>
                    Projects
                  </Link>
                </CommandItem>
                <CommandItem asChild>
                  <Link to={getPathWithParams(routes.org.settings.root, { orgId })}>
                    Org Settings
                  </Link>
                </CommandItem>
              </>
            )}
            <CommandItem asChild>
              <Link to="https://docs.datum.net/" target="_blank" rel="noreferrer">
                Docs
              </Link>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
