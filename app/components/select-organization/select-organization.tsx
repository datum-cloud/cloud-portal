import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  ChevronsUpDownIcon,
  Loader2,
  CheckIcon,
  SettingsIcon,
  PlusCircleIcon,
} from 'lucide-react'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { OrganizationItem } from './organization-item'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { useEffect, useState } from 'react'
import { cn } from '@/utils/misc'
import { Link, useFetcher } from 'react-router'
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organizations+/list'
import { routes } from '@/constants/routes'

export const SelectOrganization = ({
  currentOrg,
  onSelect,
  selectedContent,
  triggerClassName,
  hideContent = false,
  hideNewOrganization = false,
}: {
  currentOrg: Partial<OrganizationModel>
  onSelect?: (org: OrganizationModel) => void
  selectedContent?: React.ReactNode
  triggerClassName?: string
  hideContent?: boolean
  hideNewOrganization?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const fetcher = useFetcher({ key: 'org-list' })

  useEffect(() => {
    if (open) {
      fetcher.load(ORG_LIST_PATH)
    }
  }, [open])

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
            {fetcher.state === 'loading' ? (
              <CommandItem disabled>
                <Loader2 className="size-4 animate-spin" />
                <span>Loading organizations...</span>
              </CommandItem>
            ) : (
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {fetcher.data?.length > 0 &&
                  (fetcher.data ?? []).map((org: OrganizationModel) => {
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
                        className="cursor-pointer justify-between">
                        <OrganizationItem org={org} />
                        {isSelected && <CheckIcon className="size-4 text-primary" />}
                      </CommandItem>
                    )
                  })}
              </CommandGroup>
            )}

            {!hideNewOrganization && (
              <>
                <CommandItem className="cursor-pointer" asChild>
                  <Link
                    to={routes.account.organizations.new}
                    className="mb-2 flex items-center gap-2 px-3">
                    <div className="flex w-6 items-center justify-center">
                      <PlusCircleIcon className="text-blue-400" />
                    </div>
                    <span>Create Organization</span>
                  </Link>
                </CommandItem>
                <CommandSeparator />
                <CommandItem className="cursor-pointer" asChild>
                  <Link
                    to={routes.account.organizations.root}
                    className="mb-1 mt-1 flex items-center gap-2 px-3">
                    <div className="flex w-6 items-center justify-center">
                      <SettingsIcon />
                    </div>
                    <span>Manage Organizations</span>
                  </Link>
                </CommandItem>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
