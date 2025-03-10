import { OrganizationItem } from './organization-item'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { routes } from '@/constants/routes'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organizations+/list'
import { cn } from '@/utils/misc'
import {
  CheckIcon,
  ChevronsUpDownIcon,
  Loader2,
  PlusCircleIcon,
  SettingsIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useFetcher } from 'react-router'

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
            'data-[state=open]:bg-primary/5 flex h-full w-full cursor-pointer gap-2 border-none p-0 px-2',
            triggerClassName,
          )}>
          {!hideContent &&
            (selectedContent ?? <OrganizationItem org={currentOrg} className="flex-1" />)}
          <ChevronsUpDownIcon className="text-primary/60 size-4" />
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
              <CommandItem disabled className="px-3">
                <div className="flex w-6 items-center justify-center">
                  <Loader2 className="size-4 animate-spin" />
                </div>
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
                        {isSelected && <CheckIcon className="text-primary size-4" />}
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
                    className="mt-1 mb-1 flex items-center gap-2 px-3">
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
