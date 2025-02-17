import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ChevronsUpDownIcon } from 'lucide-react'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { OrganizationItem } from './organization-item'
import { SelectOrganizationList } from './organization-list'
import { useState } from 'react'
import { cn } from '@/utils/misc'
export const SelectOrganization = ({
  currentOrg,
  onSelect,
  selectedContent,
  triggerClassName,
}: {
  currentOrg: Partial<OrganizationModel>
  onSelect?: (org: OrganizationModel) => void
  selectedContent?: React.ReactNode
  triggerClassName?: string
}) => {
  const [open, setOpen] = useState(false)
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
          {selectedContent ?? <OrganizationItem org={currentOrg} className="flex-1" />}
          <ChevronsUpDownIcon className="size-4 text-primary/60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="popover-content-width-full p-0" align="start">
        {open && (
          <SelectOrganizationList
            currentOrgId={currentOrg?.id ?? ''}
            onSelect={(org) => {
              setOpen(false)
              onSelect?.(org)
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
