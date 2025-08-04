import { SelectOrganization } from '@/components/select-organization/select-organization';
import { Badge } from '@/components/ui/badge';
import { paths } from '@/config/paths';
import { useApp } from '@/providers/app.provider';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { getPathWithParams } from '@/utils/path';
import { Link, useNavigate } from 'react-router';

export const OrganizationSwitcher = ({ currentOrg }: { currentOrg: IOrganization }) => {
  const { setOrganization } = useApp();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1 pl-2">
      <Link
        to={getPathWithParams(paths.org.detail.projects.root, { orgId: currentOrg?.name })}
        className="flex w-fit items-center justify-between gap-2 text-left text-sm leading-tight">
        <span className="xs:whitespace-normal font-semibold">
          {currentOrg?.displayName ?? currentOrg?.name}
        </span>
        {currentOrg?.type === OrganizationType.Personal && (
          <Badge variant="secondary" className="border">
            Personal
          </Badge>
        )}
      </Link>
      <SelectOrganization
        triggerClassName="h-7 w-fit"
        currentOrg={currentOrg!}
        hideContent
        onSelect={(org: IOrganization) => {
          setOrganization(org);
          navigate(getPathWithParams(paths.org.detail.projects.root, { orgId: org.name }));
        }}
      />
    </div>
  );
};
