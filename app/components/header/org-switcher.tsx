import { PersonalBadge } from '@/components/personal-badge/personal-badge';
import { SelectOrganization } from '@/components/select-organization/select-organization';
import { useApp } from '@/providers/app.provider';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Building } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

export const OrganizationSwitcher = ({ currentOrg }: { currentOrg: IOrganization }) => {
  const { setOrganization } = useApp();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2.5">
      <Link
        to={getPathWithParams(paths.org.detail.projects.root, { orgId: currentOrg?.name })}
        className="flex w-fit items-center justify-between gap-3 text-left">
        <Building className="text-icon-primary h-3.5 w-fit" />
        <span className="max-w-[120px] truncate text-sm leading-3.5 sm:max-w-36 md:max-w-none">
          {currentOrg?.displayName ?? currentOrg?.name}
        </span>
        {currentOrg?.type === OrganizationType.Personal && (
          <PersonalBadge className="hidden sm:block" />
        )}
      </Link>
      <SelectOrganization
        triggerClassName="h-4 w-4 p-0 mr-2.5"
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
