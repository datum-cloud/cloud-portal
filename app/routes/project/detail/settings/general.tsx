import { ProjectDangerCard } from '@/features/project/settings/danger-card';
import { ProjectGeneralCard } from '@/features/project/settings/general-card';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runRouteGate } from '@/modules/rbac/run-resource-loader';
import { useProjectContext } from '@/providers/project.provider';
import { skipRevalidateWithinSameProject } from '@/utils/helpers/revalidate.helper';
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

export const shouldRevalidate = skipRevalidateWithinSameProject;

export const handle = {
  breadcrumb: () => <span>General</span>,
};

export default route.Page(() => <GeneralForm />);

function GeneralForm() {
  // Prefer ProjectContext (React Query) over the project-detail loader envelope.
  // Within a project, shouldRevalidate skips loader refresh, so loader data can
  // lag behind display-name updates while the header already shows the new name.
  const { project } = useProjectContext();

  if (!project) {
    return null;
  }

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
