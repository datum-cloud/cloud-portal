import { SelectOrganization } from '@/components/select-organization/select-organization';
import { Badge } from '@/components/ui/badge';
import { routes } from '@/constants/routes';
import { useApp } from '@/providers/app.provider';
import { IOrganization } from '@/resources/interfaces/organization.inteface';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Link, useNavigate } from 'react-router';

export const OrganizationSwitcher = () => {
  const { organization: currentOrg, setOrganization } = useApp();
  const navigate = useNavigate();

  if (!currentOrg) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 pl-2">
      <Link
        to={getPathWithParams(routes.org.projects.root, { orgId: currentOrg?.id })}
        className="flex w-fit max-w-[300px] items-center justify-between gap-2 text-left text-sm leading-tight">
        <span className="truncate font-semibold">
          {currentOrg?.displayName ?? currentOrg?.name}
        </span>
        {currentOrg?.status?.personal && (
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
          navigate(getPathWithParams(routes.org.projects.root, { orgId: org.id }));
        }}
      />
    </div>
  );
};
