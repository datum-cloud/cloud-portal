import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { ActivityLogTable } from '@/features/activity-log';
import { ActionCard } from '@/features/project/dashboard';
import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import { createDomainService } from '@/resources/domains';
import { createExportPolicyService } from '@/resources/export-policies';
import { createProjectService, useUpdateProject } from '@/resources/projects';
import NotFound from '@/routes/not-found';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LinkButton,
  toast,
  Tooltip,
} from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { DownloadIcon, PlusIcon } from 'lucide-react';
import { motion } from 'motion/react';
import {
  data,
  Link,
  type LoaderFunctionArgs,
  useLoaderData,
  useRevalidator,
  useRouteLoaderData,
} from 'react-router';

/**
 * Check if a dashboard item is considered completed
 * An item is considered completed if:
 * - There are resources for that item (e.g., domains.length > 0)
 * - OR the project annotation indicates it was skipped
 *
 * @param project - The project object with annotations
 * @param hasResources - Whether resources exist for this dashboard item
 * @param annotationKey - The annotation key to check (e.g., 'dashboard.domains.skipped')
 * @returns true if the dashboard item is completed (has resources or is skipped)
 *
 * @example
 * isDashboardItemCompleted(project, domains.length > 0, 'dashboard.domains.skipped')
 * // Returns true if domains exist OR if the annotation is set to 'true'
 */
const isDashboardItemCompleted = (
  project: { annotations?: Record<string, string> },
  hasResources: boolean,
  annotationKey: string
): boolean => hasResources || project.annotations?.[annotationKey] === 'true';

export const handle = {
  breadcrumb: () => <span>Home</span>,
  hideBreadcrumb: true,
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;
  if (!projectId) {
    return data({ hasDomains: false, hasDesktop: false, hasMetrics: false });
  }

  const domainService = createDomainService();
  const projectService = createProjectService();
  const exportPolicyService = createExportPolicyService();

  const [project, domains, exportPolicies] = await Promise.all([
    projectService.get(projectId),
    domainService.list(projectId, { limit: 1 }),
    exportPolicyService.list(projectId),
  ]);

  return data({
    hasDomains: isDashboardItemCompleted(project, domains.length > 0, 'dashboard.domains.skipped'),
    hasDesktop: isDashboardItemCompleted(project, false, 'dashboard.desktop.skipped'),
    hasMetrics: isDashboardItemCompleted(
      project,
      exportPolicies.length > 0,
      'dashboard.metrics.skipped'
    ),
  });
};

export default function ProjectHomePage() {
  const { project } = useRouteLoaderData('project-detail');
  const { hasDomains, hasDesktop, hasMetrics } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const { trackAction } = useAnalytics();

  const updateMutation = useUpdateProject(project?.name ?? '', {
    onSuccess: () => {
      revalidator.revalidate();
    },
    onError: (error) => {
      toast.error('Project', {
        description: error.message || 'Failed to update project',
      });
    },
  });

  if (!project) {
    return <NotFound />;
  }

  return (
    <div className="mx-auto w-full">
      {/* Header */}
      <div className="flex w-full flex-col items-start justify-start gap-4 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-center">
          <h1 className="truncate text-2xl font-medium">{project?.description}</h1>
          <p className="text-icon-primary text-xs md:ml-auto">
            Project created: <DateTime date={project.createdAt} variant="relative" />
          </p>
        </div>

        <div className="shrink-0">
          <BadgeCopy
            value={project.name ?? ''}
            text={project.name ?? ''}
            badgeTheme="solid"
            badgeType="muted"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0, ease: 'easeOut' }}>
          <ActionCard
            completed={hasDomains}
            image="/images/dashboard/domain-dashboard-image.png"
            className="h-full"
            title="Protect your app"
            text={
              <p>
                Activate a powerful reverse proxy on Datum&apos;s edge to protect your origin and
                block common attacks with a web app firewall.
              </p>
            }
            primaryButton={
              !hasDomains ? (
                <LinkButton
                  as={Link}
                  icon={<Icon icon={PlusIcon} className="size-4" />}
                  href={getPathWithParams(paths.project.detail.proxy.root, {
                    projectId: project.name,
                  })}>
                  Setup a Proxy
                </LinkButton>
              ) : (
                <LinkButton
                  as={Link}
                  theme="outline"
                  type="secondary"
                  className="border-card-success-border hover:border-secondary"
                  href={getPathWithParams(paths.project.detail.proxy.root, {
                    projectId: project.name,
                  })}>
                  Go to Proxies
                </LinkButton>
              )
            }
            onSkip={async () => {
              await updateMutation.mutateAsync({
                annotations: { 'dashboard.domains.skipped': 'true' },
              });
            }}
            showSkip={!hasDomains}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}>
          <ActionCard
            completed={hasDesktop}
            image="/images/dashboard/desktop-dashboard-image.png"
            className="h-full"
            title="Develop locally, share globally"
            text={
              <p>
                Supercharge your development workflows and securely expose internal services with
                zero-trust tunnels.
              </p>
            }
            primaryButton={
              <Tooltip message="Coming soon">
                {!hasDesktop ? (
                  <Button
                    icon={<Icon icon={DownloadIcon} className="size-4" />}
                    onClick={() => trackAction(AnalyticsAction.DownloadDesktopApp)}>
                    Install Datum Desktop
                  </Button>
                ) : (
                  <Button
                    className="border-card-success-border hover:border-secondary"
                    theme="outline"
                    type="secondary"
                    icon={<Icon icon={DownloadIcon} className="size-4" />}
                    onClick={() => trackAction(AnalyticsAction.DownloadDesktopApp)}>
                    Install Datum Desktop
                  </Button>
                )}
              </Tooltip>
            }
            onSkip={async () => {
              await updateMutation.mutateAsync({
                annotations: { 'dashboard.desktop.skipped': 'true' },
              });
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
          className="md:col-span-2 xl:col-span-1">
          <ActionCard
            completed={hasMetrics}
            image="/images/dashboard/proxy-dashboard-image.png"
            className="h-full"
            title="Export metrics to Grafana"
            text={
              <p>
                Gain real-time visibility into your Datum infrastructure and traffic by exporting
                OTel compatible metrics to Grafana Cloud.
              </p>
            }
            primaryButton={
              !hasMetrics ? (
                <LinkButton
                  as={Link}
                  href={getPathWithParams(paths.project.detail.metrics.exportPolicies.new, {
                    projectId: project.name,
                  })}
                  icon={<Icon icon={PlusIcon} className="size-4" />}>
                  Set up a Policy
                </LinkButton>
              ) : (
                <LinkButton
                  as={Link}
                  className="border-card-success-border hover:border-secondary"
                  theme="outline"
                  type="secondary"
                  href={getPathWithParams(paths.project.detail.metrics.exportPolicies.root, {
                    projectId: project.name,
                  })}>
                  Go to Policies
                </LinkButton>
              )
            }
            onSkip={async () => {
              await updateMutation.mutateAsync({
                annotations: { 'dashboard.metrics.skipped': 'true' },
              });
            }}
            showSkip={!hasMetrics}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.45, ease: 'easeOut' }}
          className="col-span-1 md:col-span-2 xl:col-span-3">
          <Card className="p-8">
            <CardHeader className="px-0">
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="text-lg font-medium">Latest Activity</span>

                <LinkButton
                  as={Link}
                  type="secondary"
                  size="xs"
                  theme="outline"
                  href={getPathWithParams(paths.project.detail.activity, {
                    projectId: project.name,
                  })}>
                  View all project activity
                </LinkButton>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ActivityLogTable
                scope={{ type: 'project', projectId: project.name }}
                defaultPageSize={5}
                hidePagination
                hideFilters
                initialActions={['Added', 'Modified', 'Deleted']}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
