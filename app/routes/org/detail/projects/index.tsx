import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { NoteCard } from '@/components/note-card/note-card';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { createProjectsControl } from '@/resources/control-plane';
import { ICachedProject } from '@/resources/interfaces/project.interface';
import { paths } from '@/utils/config/paths.config';
import { getAlertState, setAlertClosed } from '@/utils/cookies';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, Col, Row } from '@datum-ui/components';
import { IconWrapper } from '@datum-ui/components/icons/icon-wrapper';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { FolderRoot, PlusIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  ActionFunctionArgs,
  AppLoadContext,
  data,
  Link,
  LoaderFunctionArgs,
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
  useRevalidator,
} from 'react-router';

export const loader = async ({ params, request, context }: LoaderFunctionArgs) => {
  try {
    const { orgId } = params;
    const { controlPlaneClient } = context as AppLoadContext;
    const projectsControl = createProjectsControl(controlPlaneClient as Client);

    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    // Fetch fresh data from API
    const projects = await projectsControl.list(orgId);

    // Get alert state from server-side cookie
    const { isClosed: alertClosed, headers: alertHeaders } = await getAlertState(
      request,
      'projects_understanding'
    );

    return data({ projects, alertClosed }, { headers: alertHeaders });
  } catch {
    const { isClosed: alertClosed, headers: alertHeaders } = await getAlertState(
      request,
      'projects_understanding'
    );
    return data({ projects: [], alertClosed }, { headers: alertHeaders });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { headers } = await setAlertClosed(request, 'projects_understanding');
  return data({ success: true }, { headers });
};

export default function OrgProjectsPage() {
  const { orgId } = useParams();
  const { projects, alertClosed } = useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const showAlert = !alertClosed;

  useEffect(() => {
    if (fetcher.data?.success) {
      revalidator.revalidate();
    }
  }, [fetcher.data, revalidator]);

  const columns: ColumnDef<ICachedProject>[] = useMemo(
    () => [
      {
        header: 'Project',
        accessorKey: 'name',
        id: 'name',
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IconWrapper icon={FolderRoot} className="size-4" />
                <span>{row.original.description}</span>
              </div>
              <div className="flex items-center gap-6">
                <BadgeCopy
                  value={row.original.name ?? ''}
                  text={row.original.name ?? ''}
                  badgeTheme="solid"
                  badgeType="muted"
                />
                <span className="text-muted-foreground text-xs">
                  Added:{' '}
                  {row.original.createdAt && (
                    <DateTime date={row.original.createdAt} format="yyyy-MM-dd" />
                  )}
                </span>
              </div>
            </div>
          );
        },
      },
    ],
    []
  );

  const handleAlertClose = () => {
    // Save the close state via server-side cookie
    fetcher.submit({}, { method: 'POST' });
  };

  return (
    <Row gutter={[0, 24]}>
      <Col span={24}>
        <DataTable
          hideHeader
          mode="card"
          hidePagination
          columns={columns}
          data={projects ?? []}
          onRowClick={(row) => {
            if (row.name) {
              return navigate(
                getPathWithParams(paths.project.detail.root, { projectId: row.name })
              );
            }

            return undefined;
          }}
          tableTitle={{
            title: 'Projects',
            actions: (
              <Link to={getPathWithParams(paths.org.detail.projects.new, { orgId })}>
                <Button type="primary" theme="solid" size="small">
                  <IconWrapper icon={PlusIcon} className="size-4" />
                  Create project
                </Button>
              </Link>
            ),
          }}
          emptyContent={{
            title: "let's create your first project!",
            actions: [
              {
                type: 'link',
                label: 'Create project',
                to: getPathWithParams(paths.org.detail.projects.new, { orgId }),
                variant: 'default',
                icon: <IconWrapper icon={PlusIcon} className="size-3" />,
                iconPosition: 'start',
              },
            ],
          }}
          toolbar={{
            layout: 'compact',
            includeSearch: {
              placeholder: 'Search projects',
              filterKey: 'q',
            },
          }}
          defaultSorting={[{ id: 'createdAt', desc: true }]}
        />
      </Col>
      {showAlert && (
        <Col span={24}>
          <NoteCard
            closable
            onClose={handleAlertClose}
            title="Understanding Projects"
            description={
              <ul className="list-disc space-y-2 pl-5 text-sm font-normal">
                <li>Projects are dedicated instances on Datum Cloud.</li>
                <li>
                  You can use them to manage your core network services, workloads, and assets.
                </li>
                <li>There is no limit to how many you create.</li>
              </ul>
            }
          />
        </Col>
      )}
    </Row>
  );
}
