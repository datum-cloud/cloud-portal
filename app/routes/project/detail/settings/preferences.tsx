import { ProjectDangerCard } from '@/features/project/settings/danger-card';
import { ProjectGeneralCard } from '@/features/project/settings/general-card';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-ui/components';
import { MetaFunction, useRouteLoaderData } from 'react-router';

// export const handle = {
//   breadcrumb: () => <span>Preferences</span>,
// };

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Project Preferences');
});

export default function ProjectSettingsPage() {
  const { project } = useRouteLoaderData('project-detail');

  return (
    <div className="flex w-full flex-col gap-8">
      <Row gutter={[0, 32]}>
        <Col span={24}>
          <ProjectGeneralCard project={project} />
        </Col>

        {/* Labels */}
        {/* <ProjectLabelCard labels={project?.labels ?? {}} /> */}
        {/* Danger Zone */}
        <Col span={24}>
          <h3 className="mb-4 text-base font-medium">Delete Project</h3>
          <ProjectDangerCard project={project} />
        </Col>
      </Row>
    </div>
  );
}
