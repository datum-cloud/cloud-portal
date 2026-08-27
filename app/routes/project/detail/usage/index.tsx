import { UsageDashboard } from '@/features/usage';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { createProjectService } from '@/resources/projects';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { type LoaderFunctionArgs, type MetaFunction, data, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Usage'));

export const handle = {
  breadcrumb: () => <span>Usage</span>,
};

/**
 * Project-scoped usage dashboard. Gated by the same
 * `UsageMeteringDashboard` flag as the org page and Observe nav item.
 */
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw data('Project is required', { status: 400 });
  }

  const project = await createProjectService().get(projectId);
  const orgId = project.organizationId;
  if (!orgId) {
    throw data('Organization is required', { status: 400 });
  }

  const enabled = await isFeatureEnabled(FeatureFlag.UsageMeteringDashboard, orgId);
  if (!enabled) {
    throw data('Usage metering is not enabled for this organization', { status: 404 });
  }

  return {
    orgId,
    projectName: project.name,
    projectDisplayName: project.displayName || project.name,
  };
};

export default function ProjectUsagePage() {
  const { orgId, projectName, projectDisplayName } = useLoaderData<typeof loader>();

  return (
    <UsageDashboard
      orgId={orgId}
      orgLabel={orgId}
      lockedProject={{ name: projectName, displayName: projectDisplayName }}
    />
  );
}
