import { ProjectBillingCard } from '@/features/project/settings/billing-card';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { useProjectContext } from '@/providers/project.provider';
import { createProjectService } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { redirect } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Billing'));

export const handle = {
  breadcrumb: () => <span>Billing</span>,
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const projectId = params.projectId;
  if (!projectId) {
    throw redirect(paths.account.root);
  }
  const project = await createProjectService().get(projectId);
  const orgId = project?.organizationId;
  const enabled = orgId
    ? await isFeatureEnabled(FeatureFlag.Billing, orgId).catch(() => false)
    : false;
  if (!enabled) {
    throw redirect(getPathWithParams(paths.project.detail.settings.general, { projectId }));
  }
  return null;
};

export default function ProjectBillingSettingsPage() {
  const { project, org } = useProjectContext();

  if (!project) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <Row gutter={[0, 32]}>
        <Col span={24}>
          <ProjectBillingCard project={project} orgId={org?.name} />
        </Col>
      </Row>
    </div>
  );
}
