import { BadgeCopy } from '@/components/badge/badge-copy';
import { CardList } from '@/components/card-list';
import { DateTime } from '@/components/date-time';
import { InputName } from '@/components/input-name/input-name';
import { NoteCard } from '@/components/note-card/note-card';
import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import { PermissionButton, useGuardedRouteData, useResourcePermissions } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import { type Organization } from '@/resources/organizations';
import {
  createProjectService,
  projectFormSchema,
  projectKeys,
  useCreateProject,
  useProjects,
  type Project,
  type ProjectList,
} from '@/resources/projects';
import { waitForProjectReady } from '@/resources/projects/project.watch';
import { buildOrganizationNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getAlertState, setAlertClosed } from '@/utils/cookies';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Form, useWatch, type NormalizedFieldState } from '@datum-cloud/datum-ui/form';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { useTaskQueue } from '@datum-cloud/datum-ui/task-queue';
import { useQueryClient } from '@tanstack/react-query';
import { FolderRoot, PlusIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  useFetcher,
  useNavigate,
  useParams,
  useRevalidator,
  useSearchParams,
} from 'react-router';
import z from 'zod';

const ALERT_KEY = 'projects_understanding';

type LoaderData = {
  projects: ProjectList;
  alertClosed: boolean;
};

const route = defineResourceRoute<LoaderData>({
  type: 'list',
  resource: 'projects',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view projects in this organization.",
  metaTitle: 'Projects',
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<LoaderData>(args, {
    resource: 'projects',
    group: 'resourcemanager.miloapis.com',
    scope: 'org',
    namespace: buildOrganizationNamespace(args.params.orgId!),
    fetch: async ({ orgId, args: loaderArgs }) => {
      const { isClosed: alertClosed } = await getAlertState(loaderArgs.request, ALERT_KEY);
      const projects = await createProjectService().list(orgId!);
      return { projects, alertClosed };
    },
  });
export const meta = route.meta;

export const action = async ({ request }: ActionFunctionArgs) => {
  const { headers } = await setAlertClosed(request, ALERT_KEY);
  return data({ success: true }, { headers });
};

function ProjectResourceName({ field }: { field: NormalizedFieldState }) {
  const description = useWatch('description') as string | undefined;

  return (
    <InputName
      required
      label="Resource ID"
      showTooltip={false}
      description="This unique resource ID will be used to identify your project and cannot be changed."
      field={field}
      baseName={description}
    />
  );
}

export default route.Page(({ data: loaderData }) => <OrgProjectsInner loaderData={loaderData} />);

function OrgProjectsInner({ loaderData }: { loaderData: LoaderData }) {
  const { orgId } = useParams<{ orgId: string }>();
  const { data: organization } = useGuardedRouteData<Organization, Record<string, never>>(
    'org-detail'
  );

  if (!orgId) {
    throw new Error('Organization ID is required');
  }

  const { projects: initialProjects, alertClosed } = loaderData;

  const { data: queryData = initialProjects, isLoading: projectsLoading } = useProjects(
    orgId,
    undefined,
    {
      staleTime: QUERY_STALE_TIME,
      initialData: initialProjects,
      initialDataUpdatedAt: Date.now(),
      refetchOnMount: false,
    }
  );
  const projects = queryData?.items ?? [];

  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { trackAction } = useAnalytics();

  const { enqueue, showSummary } = useTaskQueue();
  const queryClient = useQueryClient();

  const alertFetcher = useFetcher<{ success: boolean }>({ key: 'alert-closed' });
  const alertSubmittedRef = useRef(false);

  const { mutateAsync: createProject } = useCreateProject();

  const { canCreate: canCreateProject } = useResourcePermissions({
    resource: 'projects',
    group: 'resourcemanager.miloapis.com',
    scope: 'org',
    verbs: ['create'],
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [openDialog, setOpenDialog] = useState(false);

  // Sync dialog state from URL search params (for external links)
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      if (canCreateProject) {
        setOpenDialog(true);
      }
      // Clean up the URL after handling (whether opened or denied) so a
      // refresh doesn't retry and so gaining permission later won't unexpectedly
      // re-trigger the dialog.
      setSearchParams(
        (prev) => {
          prev.delete('action');
          return prev;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams, canCreateProject]);

  useEffect(() => {
    if (alertSubmittedRef.current && alertFetcher.data?.success && alertFetcher.state === 'idle') {
      alertSubmittedRef.current = false;
      revalidator.revalidate();
    }
  }, [alertFetcher.data, alertFetcher.state, revalidator]);

  const showAlert = !alertClosed;
  const isPersonalOrg = organization?.type === 'Personal';
  const projectLimit = isPersonalOrg ? 2 : 10;

  const handleAlertClose = () => {
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
        orgId: orgId as string,
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
          // Update project detail cache with ready project so nav items become enabled when user clicks "View Project"
          if (outcome.result) {
            const readyProject = outcome.result as Project;
            queryClient.setQueryData(projectKeys.detail(readyProject.name), readyProject);
          }
        }
        queryClient.invalidateQueries({ queryKey: projectKeys.list(orgId) });
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
          <CardList<Project>
            data={projects}
            getId={(project) => project.name ?? ''}
            loading={projectsLoading}>
            <CardList.Header
              title="Projects"
              actions={
                <PermissionButton
                  resource="projects"
                  verb="create"
                  group="resourcemanager.miloapis.com"
                  scope="org"
                  namespace={buildOrganizationNamespace(orgId)}
                  deniedReason="You don't have permission to create projects in this organization"
                  htmlType="button"
                  onClick={() => setOpenDialog(true)}
                  type="primary"
                  theme="solid"
                  size="small"
                  data-e2e="create-project-button"
                  className="w-full sm:w-auto"
                  icon={<Icon icon={PlusIcon} className="size-4" />}>
                  Create project
                </PermissionButton>
              }>
              <CardList.Search<Project> placeholder="Search" fields={['displayName', 'name']} />
            </CardList.Header>
            <CardList.Items<Project>
              renderCard={(project) => (
                <div
                  className="flex w-full flex-col items-start justify-start gap-4 md:flex-row md:items-center md:justify-between md:gap-2"
                  data-e2e="project-card">
                  <div className="flex items-center gap-5">
                    <Icon icon={FolderRoot} className="text-icon-primary size-4" />
                    <span>{project.displayName}</span>
                  </div>
                  <div className="flex w-full flex-col items-start justify-between gap-4 md:w-auto md:flex-row md:items-center md:gap-6">
                    <BadgeCopy
                      data-e2e="project-card-id-copy"
                      value={project.name ?? ''}
                      text={project.name ?? ''}
                      badgeTheme="solid"
                      badgeType="muted"
                    />
                    <span className="text-muted-foreground text-xs">
                      Added:{' '}
                      {project.createdAt && (
                        <DateTime date={project.createdAt} format="yyyy-MM-dd" />
                      )}
                    </span>
                  </div>
                </div>
              )}
              onSelect={(project) =>
                navigate(getPathWithParams(paths.project.detail.root, { projectId: project.name }))
              }
            />
            <CardList.Empty
              title={canCreateProject ? "Let's create your first project!" : 'No projects yet'}
              action={
                canCreateProject
                  ? {
                      label: 'Create project',
                      onClick: () => setOpenDialog(true),
                      icon: <Icon icon={PlusIcon} className="size-4" />,
                      iconPosition: 'start',
                      variant: 'default',
                    }
                  : undefined
              }
            />
          </CardList>
        </Col>
        {showAlert && !projectsLoading && (
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
                      : organization?.type === 'Standard'
                        ? `Standard organizations can have up to ${projectLimit} projects. You can always reach out to request more.`
                        : `Organizations can have up to ${projectLimit} projects. You can always reach out to request more.`}
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
            <Form.Input
              data-e2e="create-project-name-input"
              placeholder="e.g. My Project"
              autoFocus
            />
          </Form.Field>

          <Form.Field name="name">
            {({ field }) => <ProjectResourceName field={field} />}
          </Form.Field>
        </div>
      </Form.Dialog>
    </>
  );
}
