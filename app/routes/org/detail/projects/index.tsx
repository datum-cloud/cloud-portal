import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { InputName } from '@/components/input-name/input-name';
import { NoteCard } from '@/components/note-card/note-card';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import { Organization } from '@/resources/organizations';
import {
  createProjectService,
  projectFormSchema,
  useCreateProject,
  useHydrateProjects,
  useProjects,
  type Project,
  projectKeys,
} from '@/resources/projects';
import { waitForProjectReady } from '@/resources/projects/project.watch';
import { paths } from '@/utils/config/paths.config';
import { getAlertState, setAlertClosed } from '@/utils/cookies';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, Col, Row, useTaskQueue } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Form } from '@datum-ui/components/new-form';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { FolderRoot, PlusIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionFunctionArgs,
  data,
  LoaderFunctionArgs,
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
  useRevalidator,
  useRouteLoaderData,
  useSearchParams,
} from 'react-router';
import z from 'zod';

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  try {
    const { orgId } = params;
    // Services now use global axios client with AsyncLocalStorage
    const projectService = createProjectService();

    if (!orgId) {
      const { isClosed: alertClosed, headers: alertHeaders } = await getAlertState(
        request,
        'projects_understanding'
      );
      return data({ projects: [], alertClosed }, { headers: alertHeaders });
    }

    // Fetch fresh data from API
    const projectList = await projectService.list(orgId);

    // Get alert state from server-side cookie
    const { isClosed: alertClosed, headers: alertHeaders } = await getAlertState(
      request,
      'projects_understanding'
    );

    return data({ projects: projectList.items, alertClosed }, { headers: alertHeaders });
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
  const { projects: initialProjects, alertClosed } = useLoaderData<typeof loader>();
  const organization = useRouteLoaderData<Organization>('org-detail');

  // Hydrate cache with SSR data (runs once on mount)
  useHydrateProjects(orgId ?? '', initialProjects ?? []);

  // Read from React Query cache
  const { data: queryData } = useProjects(orgId ?? '', undefined, {
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  // Use React Query data, fallback to SSR data
  const projects = queryData?.items ?? initialProjects ?? [];

  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { trackAction } = useAnalytics();

  const { enqueue, showSummary } = useTaskQueue();
  const queryClient = useQueryClient();

  // Alert close fetcher - native useFetcher with effect-based callback
  const alertFetcher = useFetcher<{ success: boolean }>({ key: 'alert-closed' });
  const alertSubmittedRef = useRef(false);

  const { mutateAsync: createProject } = useCreateProject();

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

  useEffect(() => {
    if (alertSubmittedRef.current && alertFetcher.data?.success && alertFetcher.state === 'idle') {
      alertSubmittedRef.current = false;
      revalidator.revalidate();
    }
  }, [alertFetcher.data, alertFetcher.state, revalidator]);

  const showAlert = !alertClosed;
  const isPersonalOrg = organization?.type === 'Personal';
  const projectLimit = isPersonalOrg ? 2 : 10;

  const columns: ColumnDef<Project>[] = useMemo(
    () => [
      {
        header: 'Project',
        accessorKey: 'name',
        id: 'name',
        cell: ({ row }) => {
          return (
            <div className="flex w-full flex-col items-start justify-start gap-4 md:flex-row md:items-center md:justify-between md:gap-2">
              <div className="flex items-center gap-5">
                <Icon icon={FolderRoot} className="text-icon-primary size-4" />
                <span>{row.original.displayName}</span>
              </div>
              <div className="flex w-full flex-col items-start justify-between gap-4 md:w-auto md:flex-row md:items-center md:gap-6">
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
    alertSubmittedRef.current = true;
    alertFetcher.submit({}, { method: 'POST' });
  };

  const handleSubmit = async (formData: z.infer<typeof projectFormSchema>) => {
    setOpenDialog(false); // Close dialog immediately

    let failureMessage = '';
    const taskTitle = `Create project "${formData.description}"`;

    enqueue({
      title: taskTitle,
      icon: <Icon icon={FolderRoot} className="size-4" />,
      cancelable: false,
      metadata: {
        scope: 'org',
        orgId,
        orgName: organization?.displayName,
      },
      processor: async (ctx) => {
        try {
          // 1. Create via API (returns 200 immediately)
          await createProject({
            name: formData.name,
            description: formData.description,
            organizationId: orgId as string,
          });

          // 2. Wait for K8s reconciliation
          const { promise, cancel } = waitForProjectReady(orgId as string, formData.name);
          ctx.onCancel(cancel); // Register cleanup - called automatically on cancel/timeout

          const readyProject = await promise;

          // 3. Task completes when Ready
          ctx.setResult(readyProject);
          ctx.succeed();
        } catch (error) {
          failureMessage = error instanceof Error ? error.message : 'Project creation failed';
          throw error;
        }
      },
      onComplete: (outcome) => {
        if (outcome.status === 'completed') {
          trackAction(AnalyticsAction.CreateProject);
        }
        queryClient.invalidateQueries({ queryKey: projectKeys.list(orgId ?? '') });
      },
      completionActions: (_result, info) => {
        if (info.status === 'failed') {
          return [
            {
              children: 'Summary',
              type: 'quaternary' as const,
              theme: 'outline' as const,
              size: 'xs' as const,
              onClick: () =>
                showSummary(taskTitle, [
                  {
                    id: formData.name,
                    label: formData.description,
                    status: 'failed',
                    message: failureMessage || 'Project creation failed',
                  },
                ]),
            },
          ];
        }

        const result = _result as Project;
        return [
          {
            children: 'View Project',
            type: 'primary',
            theme: 'outline',
            size: 'xs',
            onClick: () =>
              navigate(getPathWithParams(paths.project.detail.root, { projectId: result.name })),
          },
        ];
      },
    });
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
            defaultSorting={[{ id: 'name', desc: true }]}
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
                  <li>Projects are spaces that are used to organise and group work.</li>
                  <li>Within projects, you can manage your resources and services.</li>
                  {!isPersonalOrg && (
                    <li>
                      You can set up many projects for different uses and invite your colleagues to
                      help manage them.
                    </li>
                  )}
                  <li>
                    {isPersonalOrg
                      ? `Personal organizations can have up to ${projectLimit} projects.`
                      : `Standard organizations can have up to ${projectLimit} projects. You can always reach out to request more.`}
                  </li>
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
        description="Add a project to manage your resources and services."
        schema={projectFormSchema}
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
