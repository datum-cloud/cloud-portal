import { DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown'
import { useApp } from '@/providers/app.provider'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { SelectOrganization } from '@/components/select-organization/select-organization'
import { useNavigate } from 'react-router'
import { routes } from '@/constants/routes'
import { getPathWithParams } from '@/utils/path'

export const OrganizationSwitcher = ({
  onSelect,
}: {
  onSelect?: (org: OrganizationModel) => void
}) => {
  const { organization: currentOrg } = useApp()
  const navigate = useNavigate()

  return (
    <>
      <DropdownMenuLabel className="flex items-center justify-between">
        Selected Organization
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuLabel asChild>
        <SelectOrganization
          currentOrg={currentOrg!}
          onSelect={(org: OrganizationModel) => {
            navigate(getPathWithParams(routes.projects.root, { orgId: org.id }))
            onSelect?.(org)
          }}
        />
      </DropdownMenuLabel>
    </>
  )
}
