import { DateTime } from '@/components/date-time';
import { ActivityLogList } from '@/features/activity-log/list';
import { ActionCard } from '@/features/project/dashboard';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import {
  createDomainsControl,
  createHttpProxiesControl,
  createProjectsControl,
} from '@/resources/control-plane';
import { updateProjectSchema } from '@/resources/schemas/project.schema';
import NotFound from '@/routes/not-found';
import { paths } from '@/utils/config/paths.config';
import { dataWithToast } from '@/utils/cookies';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod/v4';
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
import type { Client } from '@hey-api/client-axios';
import { CopyIcon, DownloadIcon, PlusIcon } from 'lucide-react';
import { motion } from 'motion/react';
import {
  type ActionFunctionArgs,
  type AppLoadContext,
  data,
  type LoaderFunctionArgs,
  useLoaderData,
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

export const action = async ({ request, context, params }: ActionFunctionArgs) => {
  const { projectId } = params;
  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }
  const { controlPlaneClient } = context as AppLoadContext;
  const projectsControl = createProjectsControl(controlPlaneClient as Client);

  switch (request.method) {
    case 'PATCH': {
      try {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();
        const parsed = parseWithZod(formData, {
          schema: updateProjectSchema,
        });
        if (parsed.status !== 'success') {
          throw new Error('Invalid form data');
        }

        await projectsControl.update(projectId, parsed.value, false);
        return dataWithToast(null, {
          title: 'Project updated successfully',
          description: 'You have successfully updated your project.',
          type: 'success',
        });
      } catch (error) {
        return dataWithToast(null, {
          title: 'Failed to update project',
          description: error instanceof Error ? error.message : (error as Response).statusText,
          type: 'error',
        });
      }
    }
  }
};

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params;
  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }
  const { controlPlaneClient } = context as AppLoadContext;
  const domainsControl = createDomainsControl(controlPlaneClient as Client);
  const httpProxiesControl = createHttpProxiesControl(controlPlaneClient as Client);
  const projectsControl = createProjectsControl(controlPlaneClient as Client);

  const [project, domains, httpProxies] = await Promise.all([
    projectsControl.detail(projectId),
    domainsControl.list(projectId, { limit: 1 }),
    httpProxiesControl.list(projectId, { limit: 1 }),
  ]);

  return data({
    hasDomains: isDashboardItemCompleted(project, domains.length > 0, 'dashboard.domains.skipped'),
    hasHttpProxies: isDashboardItemCompleted(
      project,
      httpProxies.length > 0,
      'dashboard.proxy.skipped'
    ),
    hasDesktop: isDashboardItemCompleted(project, false, 'dashboard.desktop.skipped'),
  });
};

export default function ProjectHomePage() {
  const { submit } = useDatumFetcher({ key: 'project-dashboard-update' });
  const { project } = useRouteLoaderData('project-detail');
  const { hasDomains, hasHttpProxies, hasDesktop } = useLoaderData<typeof loader>();

  if (!project) {
    return <NotFound />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1 md:w-full md:flex-row md:items-center">
          <h1 className="truncate text-2xl font-medium">{project?.description}</h1>
          <p className="text-icon-primary text-xs md:ml-auto">
            Project created: <DateTime date={project.createdAt} variant="relative" />
          </p>
        </div>

        <Button
          size="xs"
          theme="light"
          className="text-badge-muted-foreground bg-badge-muted"
          onClick={() => {
            navigator.clipboard.writeText(project.name);
            toast.success('Project copied to clipboard');
          }}>
          <pre className="text-xs">{project.name}</pre>
          <CopyIcon className="size-3" />
        </Button>
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
                block common attacks with a web app firewall.{' '}
                <LinkButton
                  type="primary"
                  theme="link"
                  size="link"
                  to={getPathWithParams(paths.project.detail.domains.root, {
                    projectId: project.name,
                  })}>
                  More info
                </LinkButton>
              </p>
            }
            primaryButton={
              !hasDomains ? (
                <LinkButton
                  icon={<PlusIcon className="size-4" />}
                  to={getPathWithParams(paths.project.detail.domains.root, {
                    projectId: project.name,
                  })}>
                  Add a domain
                </LinkButton>
              ) : (
                <LinkButton
                  theme="outline"
                  type="secondary"
                  to={getPathWithParams(paths.project.detail.domains.root, {
                    projectId: project.name,
                  })}>
                  Go to domains
                </LinkButton>
              )
            }
            onSkip={async () => {
              await submit(
                {
                  projectId: project.name,
                  annotations: ['dashboard.domains.skipped:true'],
                },
                {
                  method: 'PATCH',
                }
              );
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
                <Button icon={<DownloadIcon className="size-4" />}>Install Datum Desktop</Button>
              </Tooltip>
            }
            onSkip={async () => {
              await submit(
                {
                  projectId: project.name,
                  annotations: ['dashboard.desktop.skipped:true'],
                },
                {
                  method: 'PATCH',
                }
              );
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
          className="md:col-span-2 xl:col-span-1">
          <ActionCard
            completed={hasHttpProxies}
            image="/images/dashboard/proxy-dashboard-image.png"
            className="h-full"
            title="Export metrics to Grafana"
            text={
              <p>
                Gain real-time visibility into your Datum infrastructure and traffic by exporting
                OTel compatible metrics to Grafana Cloud.{' '}
                <LinkButton
                  type="primary"
                  theme="link"
                  size="link"
                  to={getPathWithParams(paths.project.detail.proxy.root, {
                    projectId: project.name,
                  })}>
                  More info
                </LinkButton>
              </p>
            }
            primaryButton={
              !hasHttpProxies ? (
                <LinkButton
                  to={getPathWithParams(paths.project.detail.proxy.new, {
                    projectId: project.name,
                  })}
                  icon={<PlusIcon className="size-4" />}>
                  Set up a Proxy
                </LinkButton>
              ) : (
                <LinkButton
                  theme="outline"
                  type="secondary"
                  to={getPathWithParams(paths.project.detail.proxy.root, {
                    projectId: project.name,
                  })}>
                  Go to proxies
                </LinkButton>
              )
            }
            onSkip={async () => {
              await submit(
                {
                  annotations: ['dashboard.proxy.skipped:true'],
                },
                {
                  method: 'PATCH',
                }
              );
            }}
            showSkip={!hasHttpProxies}
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
                  type="secondary"
                  size="xs"
                  theme="outline"
                  to={getPathWithParams(paths.project.detail.activity, {
                    projectId: project.name,
                  })}>
                  View all project activity
                </LinkButton>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ActivityLogList params={{ project: project.id, limit: '5' }} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
