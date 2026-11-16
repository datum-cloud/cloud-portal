import { OrganizationDangerCard } from '@/features/organization';
import { OrganizationContactCard } from '@/features/organization/settings/contact-card';
import { EmailDomainJoiningCard } from '@/features/organization/settings/email-domain-joining/email-domain-joining-card';
import { OrganizationGeneralCard } from '@/features/organization/settings/general-card';
import { useGuardedRouteData } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runRouteGate } from '@/modules/rbac/run-resource-loader';
import { type Organization } from '@/resources/organizations';
import { env } from '@/utils/env';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Title } from '@datum-cloud/datum-ui/typography';
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
  const { data: organization, companions } = useGuardedRouteData<
    Organization,
    { isOwner: boolean | null }
  >('org-detail');
  // Only owners change organization settings. A failed ownership lookup
  // (null) leaves the cards read-only rather than guessing.
  const isOwner = companions.isOwner === true;

  return (
    <div className="flex w-full flex-col gap-8">
      <Row gutter={[0, 32]}>
        <Col span={24}>
          <OrganizationGeneralCard organization={organization} canEdit={isOwner} />
        </Col>

        <Col span={24}>
          <OrganizationContactCard organization={organization} canEdit={isOwner} />
        </Col>

        {env.public.emailDomainJoiningEnabled && (
          <Col span={24}>
            <EmailDomainJoiningCard organization={organization} canEdit={isOwner} />
          </Col>
        )}

        {organization.type !== 'Personal' && (
          <Col span={24}>
            <Title as="h3" level={6} weight="medium" className="mb-4">
              Delete Organization
            </Title>
            <OrganizationDangerCard organization={organization} canEdit={isOwner} />
          </Col>
        )}
      </Row>
    </div>
  );
}
