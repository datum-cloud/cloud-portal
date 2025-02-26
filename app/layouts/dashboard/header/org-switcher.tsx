import { SelectOrganization } from '@/components/select-organization/select-organization'
import { Badge } from '@/components/ui/badge'
import { routes } from '@/constants/routes'
import { useApp } from '@/providers/app.provider'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { getPathWithParams } from '@/utils/path'
import { Link, useNavigate } from 'react-router'

export const OrganizationSwitcher = ({
  onSelect,
}: {
  onSelect?: (org: OrganizationModel) => void
}) => {
  const { organization: currentOrg } = useApp()
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-1 pl-2">
      <Link
        to={getPathWithParams(routes.org.projects.root, { orgId: currentOrg?.id })}
        className="flex w-fit max-w-[300px] items-center justify-between gap-2 text-left text-sm leading-tight">
        <span className="truncate font-semibold">{currentOrg?.name}</span>
        {currentOrg?.personalOrg && (
          <Badge variant="secondary" className="border">
            Personal
          </Badge>
        )}
      </Link>
      <SelectOrganization
        triggerClassName="h-7 w-fit"
        currentOrg={currentOrg!}
        hideContent
        onSelect={(org: OrganizationModel) => {
          navigate(getPathWithParams(routes.org.projects.root, { orgId: org.id }))
          onSelect?.(org)
        }}
      />
    </div>
  )
}
