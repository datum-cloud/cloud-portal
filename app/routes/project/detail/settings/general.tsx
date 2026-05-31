import { RestrictedState } from '@/components/restricted-state/restricted-state';
import { ProjectDangerCard } from '@/features/project/settings/danger-card';
import { ProjectGeneralCard } from '@/features/project/settings/general-card';
import { useGuardedRouteData, useResourcePermissions } from '@/modules/rbac';
import { gateRouteAccess } from '@/modules/rbac/server/check-permission';
import { type Project } from '@/resources/projects';
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
  const projectId = args.params.projectId;
  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const allowed = await gateRouteAccess('', {
    resource: 'projects',
    verb: 'patch',
    group: 'resourcemanager.miloapis.com',
    scope: 'user',
    name: projectId,
  });

  if (!allowed) {
    return data({ restricted: true as const });
  }

  return data({ restricted: false as const });
});

export default function ProjectGeneralSettingsPage() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.restricted) {
    return (
      <RestrictedState
        title="Access restricted"
        message="You don't have permission to edit this project."
      />
    );
  }

  return <GeneralForm />;
}

function GeneralForm() {
  const { data: project } = useGuardedRouteData<
    Project,
    { usageMeteringEnabled: boolean; organizationId?: string | null }
  >('project-detail');

  const { canDelete } = useResourcePermissions({
    resource: 'projects',
    group: 'resourcemanager.miloapis.com',
    scope: 'user',
    verbs: ['delete'],
  });

  return (
    <div className="flex w-full flex-col gap-8">
      <Row gutter={[0, 32]}>
        <Col span={24}>
          <ProjectGeneralCard project={project} />
        </Col>

        {canDelete && (
          <Col span={24}>
            <h3 className="mb-4 text-base font-medium">Delete Project</h3>
            <ProjectDangerCard project={project} />
          </Col>
        )}
      </Row>
    </div>
  );
}
