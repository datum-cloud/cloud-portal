import { SelectOrganization } from '@/components/select-organization/select-organization';
import { Badge } from '@/components/ui/badge';
import { routes } from '@/constants/routes';
import { useApp } from '@/providers/app.provider';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.inteface';
import { getPathWithParams } from '@/utils/path';
import { Link, useNavigate } from 'react-router';

export const OrganizationSwitcher = () => {
  const { organization: currentOrg, setOrganization } = useApp();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1 pl-2">
      <Link
        to={getPathWithParams(routes.org.projects.root, { orgId: currentOrg?.name })}
        className="flex w-fit max-w-[300px] items-center justify-between gap-2 text-left text-sm leading-tight">
        <span className="truncate font-semibold">
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
          navigate(getPathWithParams(routes.org.projects.root, { orgId: org.name }));
        }}
      />
    </div>
  );
};
