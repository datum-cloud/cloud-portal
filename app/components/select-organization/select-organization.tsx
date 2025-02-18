import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ChevronsUpDownIcon, Loader2, CheckIcon } from 'lucide-react'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { OrganizationItem } from './organization-item'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { useEffect, useState } from 'react'
import { cn } from '@/utils/misc'
import { useFetcher } from 'react-router'
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organizations+/list'

export const SelectOrganization = ({
  currentOrg,
  onSelect,
  selectedContent,
  triggerClassName,
  hideContent = false,
}: {
  currentOrg: Partial<OrganizationModel>
  onSelect?: (org: OrganizationModel) => void
  selectedContent?: React.ReactNode
  triggerClassName?: string
  hideContent?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const fetcher = useFetcher({ key: 'org-list' })
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (open && !hasLoaded) {
      fetcher.load(ORG_LIST_PATH)
      setHasLoaded(true)
    }
  }, [open, hasLoaded])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'flex h-full w-full gap-2 border-none p-0 px-2 data-[state=open]:bg-primary/5',
            triggerClassName,
          )}>
          {!hideContent &&
            (selectedContent ?? <OrganizationItem org={currentOrg} className="flex-1" />)}
          <ChevronsUpDownIcon className="size-4 text-primary/60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="popover-content-width-full min-w-[300px] p-0"
        align="center">
        <Command>
          <CommandInput
            className="h-9 rounded-md border-none focus-visible:ring-0"
            placeholder="Find Organization..."
          />
          <CommandList className="max-h-none">
            <CommandEmpty>No results found.</CommandEmpty>
            {fetcher.state === 'loading' && (
              <CommandItem disabled>
                <Loader2 className="size-4 animate-spin" />
                <span>Loading organizations...</span>
              </CommandItem>
            )}
            {fetcher.data?.length > 0 && (
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {(fetcher.data ?? []).map((org: OrganizationModel) => {
                  const isSelected = org.id === currentOrg?.id
                  return (
                    <CommandItem
                      value={`${org.name}-${org.id}`}
                      key={org.id}
                      onSelect={() => {
                        setOpen(false)
                        if (!isSelected) {
                          onSelect?.(org)
                        }
                      }}
                      className="justify-between">
                      <OrganizationItem org={org} />
                      {isSelected && <CheckIcon className="size-4 text-primary" />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
