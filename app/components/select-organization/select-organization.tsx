import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ChevronsUpDownIcon, Loader2 } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { useFetcher } from 'react-router'
import { useEffect, useState } from 'react'
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organizations+/list'
import { OrganizationItem } from './organization-item'

export const SelectOrganization = ({
  currentOrg,
  onSelect,
}: {
  currentOrg: Partial<OrganizationModel>
  onSelect?: (org: OrganizationModel) => void
}) => {
  const fetcher = useFetcher({ key: 'org-list' })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetcher.load(ORG_LIST_PATH)
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild className="w-full">
        <Button
          variant="outline"
          size="sm"
          className="flex h-11 w-full justify-between gap-2 border-none p-0 px-2 data-[state=open]:bg-primary/5">
          <OrganizationItem org={currentOrg} />
          <ChevronsUpDownIcon className="size-4 text-primary/60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="popover-content-width-full p-0" align="start">
        <Command>
          <CommandInput
            className="h-9 rounded-md border-none focus-visible:ring-0"
            placeholder="Search Organization"
          />
          <CommandList className="max-h-full">
            <CommandEmpty>No results found.</CommandEmpty>
            {fetcher.state === 'loading' ? (
              <CommandItem disabled>
                <Loader2 className="size-4 animate-spin" />
                <span>Loading organizations...</span>
              </CommandItem>
            ) : (
              (fetcher.data ?? [])
                .filter((org: OrganizationModel) => org.id !== currentOrg?.id)
                .map((org: OrganizationModel) => (
                  <CommandItem
                    key={org.id}
                    onSelect={() => {
                      setOpen(false)
                      onSelect?.(org)
                    }}>
                    <OrganizationItem org={org} />
                  </CommandItem>
                ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
