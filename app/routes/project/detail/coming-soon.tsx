import { resolveComingSoonService } from '@/modules/project-nav/coming-soon';
import { useProjectPlugins } from '@/modules/plugins/client/use-project-plugins';
import { useApp } from '@/providers/app.provider';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { EmptyContent } from '@datum-cloud/datum-ui/empty-content';
import type { MetaFunction } from 'react-router';
import { useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Coming Soon</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Coming Soon'));

export default function ProjectComingSoonPage() {
  const { projectId = '', serviceId = '' } = useParams<{
    projectId: string;
    serviceId: string;
  }>();
  const { user } = useApp();
  const { data: plugins = [] } = useProjectPlugins(projectId, { enabled: !!projectId });

  const service = resolveComingSoonService(serviceId, plugins);
  const homeHref = getPathWithParams(paths.project.detail.home, { projectId });
  const userName = user?.givenName?.trim() || undefined;

  if (!service) {
    return (
      <EmptyContent
        className="w-full [&>div]:!max-w-[360px]"
        size="lg"
        userName={userName}
        title="this service isn't listed yet"
        subtitle="It may have moved, or the link is out of date."
        actions={[
          {
            as: 'link',
            to: homeHref,
            label: 'Back to project home',
            type: 'secondary',
          },
        ]}
      />
    );
  }

  const roadmapUrl = service.roadmapUrl?.trim() || undefined;

  return (
    <EmptyContent
      className="w-full [&>div]:!max-w-[360px]"
      size="lg"
      userName={userName}
      title={`${service.title} is coming soon`}
      subtitle={
        service.description?.trim() ||
        'This service is still in the works. Check back soon, or learn more on our site.'
      }
      actions={
        roadmapUrl
          ? [
              {
                as: 'external-link',
                to: roadmapUrl,
                label: 'Learn more',
                type: 'primary',
              },
            ]
          : [
              {
                as: 'link',
                to: homeHref,
                label: 'Back to project home',
                type: 'secondary',
              },
            ]
      }
    />
  );
}
