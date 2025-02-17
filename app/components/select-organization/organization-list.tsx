import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { useState, useEffect } from 'react'
import { useFetcher } from 'react-router'
import { ROUTE_PATH as ORG_LIST_PATH } from '@/routes/api+/organizations+/list'
import { Loader2 } from 'lucide-react'
import { OrganizationItem } from './organization-item'

export const SelectOrganizationList = ({
  currentOrgId,
  onSelect,
}: {
  currentOrgId: string
  onSelect?: (org: OrganizationModel) => void
}) => {
  const fetcher = useFetcher({ key: 'org-list' })
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (!hasLoaded) {
      fetcher.load(ORG_LIST_PATH)
      setHasLoaded(true)
    }
  }, [hasLoaded])

  return (
    <Command>
      <CommandInput
        className="h-9 rounded-md border-none focus-visible:ring-0"
        placeholder="Search Organization"
      />
      <CommandList className="max-h-none">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Choose Organization">
          <div className="max-h-[300px] overflow-y-auto">
            {fetcher.state === 'loading' ? (
              <CommandItem disabled>
                <Loader2 className="size-4 animate-spin" />
                <span>Loading organizations...</span>
              </CommandItem>
            ) : (
              (fetcher.data ?? [])
                .filter((org: OrganizationModel) => org.id !== currentOrgId)
                .map((org: OrganizationModel) => (
                  <CommandItem
                    key={org.id}
                    onSelect={() => {
                      onSelect?.(org)
                    }}>
                    <OrganizationItem org={org} />
                  </CommandItem>
                ))
            )}
          </div>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
