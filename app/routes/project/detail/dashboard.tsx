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
  Col,
  LinkButton,
  Row,
  toast,
} from '@datum-ui/components';
import { CopyIcon, PlusIcon } from 'lucide-react';
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
          className="text-badge-muted-foreground bg-badge-muted mb-auto"
          onClick={() => {
            navigator.clipboard.writeText(project.name);
            toast.success('Project ID copied to clipboard');
          }}>
          <pre className="text-xs">{project.name}</pre>
          <CopyIcon className="size-3" />
        </Button>
      </div>

      {/* Grid */}
      <div className="mt-8">
        <Row gutter={{ xs: 8, sm: 16, md: 32 }} className="gap-8">
          <Col xs={24} sm={24} md={12} lg={8}>
            <ActionCard
              className="mt-4 gap-3 p-8 md:mt-0"
              title="Protect your app"
              text={
                <p>
                  Activate a powerful reverse proxy on Datum&apos;s edge to protect your origin and
                  block common attacks with a web app firewall. More info
                </p>
              }
              primaryButton={<Button icon={<PlusIcon className="size-4" />}>Add a domain</Button>}
              secondaryButton={
                <Button type="quaternary" theme="outline">
                  Skip
                </Button>
              }
            />
          </Col>

          <Col xs={24} sm={24} md={12} lg={8}>
            <ActionCard
              className="mt-4 gap-3 p-8 md:mt-0"
              title="Protect your app"
              text={
                <p>
                  Activate a powerful reverse proxy on Datum&apos;s edge to protect your origin and
                  block common attacks with a web app firewall. More info
                </p>
              }
              primaryButton={<Button icon={<PlusIcon className="size-4" />}>Add a domain</Button>}
              secondaryButton={
                <Button type="quaternary" theme="outline">
                  Skip
                </Button>
              }
            />
          </Col>

          <Col xs={24} sm={24} md={24} lg={8}>
            <ActionCard
              className="mt-4 gap-3 p-8 md:mt-8 lg:mt-0"
              title="Protect your app"
              text={
                <p>
                  Activate a powerful reverse proxy on Datum&apos;s edge to protect your origin and
                  block common attacks with a web app firewall. More info
                </p>
              }
              primaryButton={<Button icon={<PlusIcon className="size-4" />}>Add a domain</Button>}
              secondaryButton={
                <Button type="quaternary" theme="outline">
                  Skip
                </Button>
              }
            />
          </Col>
        </Row>

        <Row gutter={{ xs: 8, sm: 16, md: 32 }} className="mt-4 md:mt-8">
          <Col span={24}>
            <Card className="p-8">
              <CardHeader className="px-0">
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="text-lg font-medium">Latest Activity</span>

                  <LinkButton
                    type="secondary"
                    size="xs"
                    theme="outline"
                    to={getPathWithParams(paths.project.detail.activity, {
                      projectId: project?.name,
                    })}>
                    View all project activity
                  </LinkButton>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ActivityLogList params={{ project: project?.id, limit: '5' }} />
              </CardContent>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
