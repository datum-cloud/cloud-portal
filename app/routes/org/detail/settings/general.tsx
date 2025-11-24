import { OrganizationDangerCard } from '@/features/organization';
import { OrganizationGeneralCard } from '@/features/organization/settings/general-card';
import { OrganizationType } from '@/resources/interfaces/organization.interface';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-ui/components';
import { MetaFunction, useRouteLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('General');
});

export default function OrgGeneralSettingsPage() {
  const organization = useRouteLoaderData('org-detail');

  return (
    <div className="flex w-full flex-col gap-8">
      <Row gutter={[0, 32]}>
        <Col span={24}>
          <OrganizationGeneralCard organization={organization ?? {}} />
        </Col>

        {organization && organization?.type !== OrganizationType.Personal && (
          <Col span={24}>
            <h3 className="mb-4 text-base font-medium">Delete Organization</h3>
            <OrganizationDangerCard organization={organization ?? {}} />
          </Col>
        )}
      </Row>
    </div>
  );
}
