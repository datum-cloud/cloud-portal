import { ExportPolicyUpdateForm } from '@/features/metric/export-policies/form/update-form';
import { type ExportPolicy } from '@/resources/export-policies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { MetaFunction, useParams, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Edit</span>,
};

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find((match) => match.id === 'export-policy-detail') as any;

  const exportPolicy = match.data;
  return metaObject((exportPolicy as ExportPolicy)?.name || 'Export Policy');
});

export default function ExportPolicyEditPage() {
  const exportPolicy = useRouteLoaderData('export-policy-detail');

  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <ExportPolicyUpdateForm defaultValue={exportPolicy} projectId={projectId} />
    </div>
  );
}
