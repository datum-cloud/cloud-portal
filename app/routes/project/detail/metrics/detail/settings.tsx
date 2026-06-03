import { RestrictedState } from '@/components/restricted-state/restricted-state';
import { ExportPolicyUpdateForm } from '@/features/metric/export-policies/form/update-form';
import { useGuardedRouteData } from '@/modules/rbac';
import { gateRouteAccess } from '@/modules/rbac/server/check-permission';
import { type ExportPolicy, type IExportPolicyControlResponse } from '@/resources/export-policies';
import { BadRequestError, withLoaderErrors } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import {
  data,
  useLoaderData,
  useParams,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>Settings</span>,
};

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find((match) => match.id === 'export-policy-detail') as any;

  const exportPolicy = match.data;
  return metaObject((exportPolicy as ExportPolicy)?.name || 'Export Policy');
});

export const loader = withLoaderErrors(async (args: LoaderFunctionArgs) => {
  const { projectId, exportPolicyId } = args.params;
  if (!projectId || !exportPolicyId) {
    throw new BadRequestError('Project ID and export policy ID are required');
  }

  const allowed = await gateRouteAccess(projectId, {
    resource: 'exportpolicies',
    verb: 'patch',
    group: 'telemetry.miloapis.com',
    scope: 'project',
    // Required for project-scoped checks: RbacService.resolveBaseURL reads
    // check.projectId (the first positional arg is ignored for scope:'project').
    // Omitting it throws "projectId is required…" → the check fails closed.
    projectId,
  });

  if (!allowed) {
    return data({ restricted: true as const });
  }

  return data({ restricted: false as const });
});

export default function ExportPolicySettingsPage() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.restricted) {
    return (
      <RestrictedState
        title="Access restricted"
        message="You don't have permission to edit this export policy."
      />
    );
  }

  return <SettingsForm />;
}

function SettingsForm() {
  const { data } = useGuardedRouteData<ExportPolicy, Record<string, never>>('export-policy-detail');
  const exportPolicy = data as unknown as IExportPolicyControlResponse;

  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <ExportPolicyUpdateForm defaultValue={exportPolicy} projectId={projectId} />
    </div>
  );
}
