import { OrganizationDangerCard } from '@/features/organization';
import { OrganizationGeneralCard } from '@/features/organization/settings/general-card';
import { useGuardedRouteData } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runRouteGate } from '@/modules/rbac/run-resource-loader';
import { type Organization } from '@/resources/organizations';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { type LoaderFunctionArgs } from 'react-router';

const route = defineResourceRoute({
  type: 'gate',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to edit this organization.",
  metaTitle: 'General',
});

// Organization is a root resource: gate `organizations:patch` at the user/root
// control plane against the named instance (scope:'user' + name).
export const loader = (args: LoaderFunctionArgs) =>
  runRouteGate(args, {
    resource: 'organizations',
    verb: 'patch',
    group: 'resourcemanager.miloapis.com',
    scope: 'user',
    name: args.params.orgId,
  });
export const meta = route.meta;

export const handle = {
  breadcrumb: () => <span>General</span>,
};

export default route.Page(() => <GeneralForm />);

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
