import { useApp } from '@/providers/app.provider'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { SelectOrganization } from '@/components/select-organization/select-organization'
import { useNavigate } from 'react-router'
import { routes } from '@/constants/routes'
import { getPathWithParams } from '@/utils/path'
import { Badge } from '@/components/ui/badge'
export const OrganizationSwitcher = ({
  onSelect,
}: {
  onSelect?: (org: OrganizationModel) => void
}) => {
  const { organization: currentOrg } = useApp()
  const navigate = useNavigate()

  return (
    <SelectOrganization
      triggerClassName="h-9 w-fit"
      currentOrg={currentOrg!}
      onSelect={(org: OrganizationModel) => {
        navigate(getPathWithParams(routes.projects.root, { orgId: org.id }))
        onSelect?.(org)
      }}
      selectedContent={
        <div className="flex w-full min-w-[200px] max-w-[300px] items-center justify-between gap-2 text-left text-sm leading-tight">
          <span className="truncate font-semibold">{currentOrg?.name}</span>
          <Badge variant="secondary" className="border">
            {currentOrg?.personalOrg ? 'Personal' : 'Business'}
          </Badge>
        </div>
      }
    />
  )
}
