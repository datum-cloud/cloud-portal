import { ProjectDangerCard } from '@/features/project/settings/danger-card';
import { ProjectGeneralCard } from '@/features/project/settings/general-card';
import { useGuardedRouteData } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runRouteGate } from '@/modules/rbac/run-resource-loader';
import { type Project } from '@/resources/projects';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { type LoaderFunctionArgs } from 'react-router';

const route = defineResourceRoute({
  type: 'gate',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to edit this project.",
  metaTitle: 'General',
});

// Project is a root resource: gate `projects:patch` at the user/root control
// plane against the named instance (scope:'user' + name). runRouteGate shares
// resolveScopeContext + error mapping with the list/detail loaders.
export const loader = (args: LoaderFunctionArgs) =>
  runRouteGate(args, {
    resource: 'projects',
    verb: 'patch',
    group: 'resourcemanager.miloapis.com',
    scope: 'user',
    name: args.params.projectId,
  });
export const meta = route.meta;

export const handle = {
  breadcrumb: () => <span>General</span>,
};

export default route.Page(() => <GeneralForm />);

function GeneralForm() {
  const { data: project } = useGuardedRouteData<Project, { organizationId?: string | null }>(
    'project-detail'
  );

  return (
    <div className="flex w-full flex-col gap-8">
      <Row gutter={[0, 32]}>
        <Col span={24}>
          <ProjectGeneralCard project={project} />
        </Col>

        <Col span={24}>
          <h3 className="mb-4 text-base font-medium">Delete Project</h3>
          <ProjectDangerCard project={project} />
        </Col>
      </Row>
    </div>
  );
}
