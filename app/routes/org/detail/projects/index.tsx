import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { InputName } from '@/components/input-name/input-name';
import { NoteCard } from '@/components/note-card/note-card';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { createProjectsControl } from '@/resources/control-plane';
import { ICachedProject } from '@/resources/interfaces/project.interface';
import { projectSchema } from '@/resources/schemas/project.schema';
import { ROUTE_PATH as PROJECTS_PATH } from '@/routes/api/projects';
import { paths } from '@/utils/config/paths.config';
import { getAlertState, setAlertClosed } from '@/utils/cookies';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, Col, Row, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Form } from '@datum-ui/components/new-form';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { FolderRoot, PlusIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActionFunctionArgs,
  AppLoadContext,
  data,
  LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
  useParams,
  useRevalidator,
  useSearchParams,
} from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';
import z from 'zod';

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
  const revalidator = useRevalidator();
  const csrf = useAuthenticityToken();

  const [searchParams, setSearchParams] = useSearchParams();
  const [openDialog, setOpenDialog] = useState(false);

  // Sync dialog state from URL search params (for external links)
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setOpenDialog(true);
      // Clean up the URL after opening
      setSearchParams(
        (prev) => {
          prev.delete('action');
          return prev;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

  const alertFetcher = useDatumFetcher({
    key: 'alert-closed',
    onSuccess: () => {
      revalidator.revalidate();
    },
  });

  const createFetcher = useDatumFetcher({
    key: 'create-project',
    onSuccess: () => {
      setOpenDialog(false);
      revalidator.revalidate();
    },
    onError: (error) => {
      toast.error('Project', {
        description: error?.error || 'Failed to create project',
      });
    },
  });

  const showAlert = !alertClosed;

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
                <Icon icon={FolderRoot} className="size-4" />
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
    alertFetcher.submit({}, { method: 'POST' });
  };

  const handleSubmit = async (data: z.infer<typeof projectSchema>) => {
    return createFetcher.submit(
      {
        ...data,
        orgEntityId: orgId as string,
        csrf: csrf as string,
      },
      { method: 'POST', action: PROJECTS_PATH, encType: 'application/json' }
    );
  };

  return (
    <>
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
                <Button
                  type="primary"
                  theme="solid"
                  size="small"
                  onClick={() => setOpenDialog(true)}>
                  <Icon icon={PlusIcon} className="size-4" />
                  Create project
                </Button>
              ),
            }}
            emptyContent={{
              title: "let's create your first project!",
              actions: [
                {
                  type: 'button',
                  label: 'Create project',
                  onClick: () => setOpenDialog(true),
                  variant: 'default',
                  icon: <Icon icon={PlusIcon} className="size-3" />,
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
      <Form.Dialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        title="Create a Project"
        description="Add a project to manage your core network services, workloads, and assets."
        schema={projectSchema}
        defaultValues={{
          name: '',
          description: '',
          orgEntityId: orgId,
        }}
        onSubmit={handleSubmit}
        submitText="Confirm"
        submitTextLoading="Creating..."
        className="w-full sm:max-w-3xl">
        <div className="divide-border space-y-0 divide-y [&>*]:px-5 [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field
            name="description"
            label="Project name"
            description="Could be the name of a site, initiative, project, goal, whatever works. Can be changed."
            required>
            <Form.Input placeholder="e.g. My Project" autoFocus />
          </Form.Field>

          <Form.Field name="name">
            {({ field, fields }) => (
              <InputName
                required
                label="Resource ID"
                showTooltip={false}
                description="This unique resource ID will be used to identify your project and cannot be changed."
                field={field}
                baseName={fields.description?.value as string}
              />
            )}
          </Form.Field>
        </div>
      </Form.Dialog>
    </>
  );
}
