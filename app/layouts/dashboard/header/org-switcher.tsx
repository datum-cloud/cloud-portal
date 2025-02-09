import { DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown'
import { useApp } from '@/providers/app.provider'

import { SelectOrganization } from '@/components/select-organization/select-organization'
export const OrganizationSwitcher = () => {
  const { organization: currentOrg } = useApp()

  return (
    <>
      <DropdownMenuLabel className="flex items-center justify-between">
        Selected Organization
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuLabel asChild>
        {/* TODO: Add handle for organization switcher. Update the current org session*/}
        <SelectOrganization currentOrg={currentOrg!} onSelect={() => {}} />
      </DropdownMenuLabel>
    </>
  )
}
