import { BadgeStatus } from '@/components/badge/badge-status';
import { SelectOrganization } from '@/components/select-organization/select-organization';
import { useApp } from '@/providers/app.provider';
import type { Organization } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Building } from 'lucide-react';
import { useNavigate } from 'react-router';

export const OrganizationSwitcher = ({ currentOrg }: { currentOrg: Organization }) => {
  const { setOrganization } = useApp();
  const navigate = useNavigate();

  return (
    <SelectOrganization
      triggerClassName="flex w-fit items-center justify-between gap-3 text-left px-0 font-normal"
      currentOrg={currentOrg!}
      hideContent={false}
      selectedContent={
        <>
          <Icon icon={Building} className="text-icon-primary h-3.5 w-fit" />
          <span className="truncate text-xs leading-3.5 sm:max-w-36 md:max-w-none">
            {currentOrg?.displayName ?? currentOrg?.name}
          </span>
          {currentOrg?.type === 'Personal' && (
            <BadgeStatus status={currentOrg.type} className="hidden sm:block" />
          )}
        </>
      }
      onSelect={(org: Organization) => {
        setOrganization(org);
        navigate(getPathWithParams(paths.org.detail.projects.root, { orgId: org.name }));
      }}
    />
  );
};
