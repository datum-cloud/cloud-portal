import { ExportPolicyUpdateForm } from '@/features/metric/export-policies/form/update-form';
import { useGuardedRouteData } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runRouteGate } from '@/modules/rbac/run-resource-loader';
import { type ExportPolicy, type IExportPolicyControlResponse } from '@/resources/export-policies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { useParams, type LoaderFunctionArgs, type MetaFunction } from 'react-router';

// Gate-only route: render-side restriction comes from `route.Page`. We keep a
// custom `meta` (reads the parent export-policy-detail match) and `handle`
// rather than the gate DSL's metaTitle, so only `route.Page` is used here.
const route = defineResourceRoute({
  type: 'gate',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to edit this export policy.",
});

export const handle = {
  breadcrumb: () => <span>Settings</span>,
};

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find((match) => match.id === 'export-policy-detail') as any;

  const exportPolicy = match.data;
  return metaObject((exportPolicy as ExportPolicy)?.name || 'Export Policy');
});

export const loader = (args: LoaderFunctionArgs) =>
  runRouteGate(args, {
    resource: 'exportpolicies',
    verb: 'patch',
    group: 'telemetry.miloapis.com',
    scope: 'project',
  });

export default route.Page(() => <SettingsForm />);

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
