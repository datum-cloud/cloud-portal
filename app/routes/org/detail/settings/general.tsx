import { RestrictedState } from '@/components/restricted-state/restricted-state';
import { OrganizationDangerCard } from '@/features/organization';
import { OrganizationGeneralCard } from '@/features/organization/settings/general-card';
import { useGuardedRouteData } from '@/modules/rbac';
import { gateRouteAccess } from '@/modules/rbac/server/check-permission';
import { type Organization } from '@/resources/organizations';
import { BadRequestError, withLoaderErrors } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { data, useLoaderData, type LoaderFunctionArgs, type MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('General');
});

export const handle = {
  breadcrumb: () => <span>General</span>,
};

export const loader = withLoaderErrors(async (args: LoaderFunctionArgs) => {
  const orgId = args.params.orgId;
  if (!orgId) {
    throw new BadRequestError('Organization ID is required');
  }

  const allowed = await gateRouteAccess('', {
    resource: 'organizations',
    verb: 'patch',
    group: 'resourcemanager.miloapis.com',
    scope: 'user',
    name: orgId,
  });

  if (!allowed) {
    return data({ restricted: true as const });
  }

  return data({ restricted: false as const, data: null, companions: {} });
});

export default function OrgGeneralSettingsPage() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.restricted) {
    return (
      <RestrictedState
        title="Access restricted"
        message="You don't have permission to edit this organization."
      />
    );
  }

  return <GeneralForm />;
}

function GeneralForm() {
  const { data: organization } = useGuardedRouteData<Organization, Record<string, never>>(
    'org-detail'
  );

  return (
    <div className="flex w-full flex-col gap-8">
      <Row gutter={[0, 32]}>
        <Col span={24}>
          <OrganizationGeneralCard organization={organization} />
        </Col>

        {organization.type !== 'Personal' && (
          <Col span={24}>
            <h3 className="mb-4 text-base font-medium">Delete Organization</h3>
            <OrganizationDangerCard organization={organization} />
          </Col>
        )}
      </Row>
    </div>
  );
}
