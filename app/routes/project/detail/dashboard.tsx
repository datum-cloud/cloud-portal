import { DateTime } from '@/components/date-time';
import { ActivityLogList } from '@/features/activity-log/list';
import { ActionCard } from '@/features/project/dashboard';
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
} from '@datum-ui/components';
import { CopyIcon, DownloadIcon, PlusIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Home</span>,
  hideBreadcrumb: true,
};

export default function ProjectDashboardLandingPage() {
  const { project } = useRouteLoaderData('project-detail');

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
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0, ease: 'easeOut' }}>
          <ActionCard
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
              <LinkButton
                icon={<PlusIcon className="size-4" />}
                to={getPathWithParams(paths.project.detail.domains.root, {
                  projectId: project.name,
                })}>
                Add a domain
              </LinkButton>
            }
            secondaryButton={
              <Button type="quaternary" theme="outline">
                Skip
              </Button>
            }
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}>
          <ActionCard
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
              <Button icon={<DownloadIcon className="size-4" />}>Install Datum Desktop</Button>
            }
            secondaryButton={
              <Button type="quaternary" theme="outline">
                Skip
              </Button>
            }
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
          className="md:col-span-2 xl:col-span-1">
          <ActionCard
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
              <LinkButton
                to={getPathWithParams(paths.project.detail.proxy.new, { projectId: project.name })}
                icon={<PlusIcon className="size-4" />}>
                Set up a Proxy
              </LinkButton>
            }
            secondaryButton={
              <Button type="quaternary" theme="outline">
                Skip
              </Button>
            }
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
              <ActivityLogList params={{ project: project?.id, limit: '5' }} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
