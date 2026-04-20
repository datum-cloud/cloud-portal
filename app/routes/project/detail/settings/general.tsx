import { ProjectDangerCard } from '@/features/project/settings/danger-card';
import { ProjectGeneralCard } from '@/features/project/settings/general-card';
import { useProjectContext } from '@/providers/project.provider';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('General');
});

export const handle = {
  breadcrumb: () => <span>General</span>,
};

export default function ProjectGeneralSettingsPage() {
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
