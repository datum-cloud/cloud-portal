import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateFormat } from '@/components/date-format/date-format';
import { MoreActions } from '@/components/more-actions/more-actions';
import { PageTitle } from '@/components/page-title/page-title';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { ExportPolicyGeneralCard } from '@/features/observe/export-policies/general-card';
import { WorkloadSinksTable } from '@/features/observe/export-policies/sinks-table';
import { WorkloadSourcesTable } from '@/features/observe/export-policies/sources-table';
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { ROUTE_PATH as EXPORT_POLICIES_ACTIONS_ROUTE_PATH } from '@/routes/old/api+/observe+/actions';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { ClockIcon, PencilIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, MetaFunction, useParams, useRouteLoaderData, useSubmit } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find(
    (match) =>
      match.id ===
      'routes/_private+/$orgId+/projects.$projectId+/_observe+/export-policies+/$exportPolicyId+/_layout'
  ) as any;

  const exportPolicy = match.data;
  return metaObject((exportPolicy as IExportPolicyControlResponse)?.name || 'Export Policy');
});

export default function ExportPolicyOverview() {
  const exportPolicy = useRouteLoaderData(
    'routes/_private+/$orgId+/projects.$projectId+/_observe+/export-policies+/$exportPolicyId+/_layout'
  );

  const submit = useSubmit();
  const { confirm } = useConfirmationDialog();
  const { orgId, projectId } = useParams();

  // revalidate every 10 seconds to keep deployment list fresh
  const revalidator = useRevalidateOnInterval({ enabled: true, interval: 10000 });

  const deleteExportPolicy = async () => {
    await confirm({
      title: 'Delete Export Policy',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{exportPolicy?.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        // Clear the interval when deleting a export policy
        revalidator.clear();

        await submit(
          {
            exportPolicyId: exportPolicy?.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            action: EXPORT_POLICIES_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
            fetcherKey: 'export-policy-resources',
            navigate: false,
          }
        );
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex w-full flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageTitle
          title={(exportPolicy as IExportPolicyControlResponse)?.name ?? 'Export Policy'}
          description={
            <div className="flex items-center gap-1">
              <ClockIcon className="text-muted-foreground h-4 w-4" />
              <DateFormat
                className="text-muted-foreground text-sm"
                date={(exportPolicy as IExportPolicyControlResponse)?.createdAt ?? ''}
              />
              <span className="text-muted-foreground text-sm">
                (
                {formatDistanceToNow(
                  new Date((exportPolicy as IExportPolicyControlResponse)?.createdAt ?? ''),
                  {
                    addSuffix: true,
                  }
                )}
                )
              </span>
            </div>
          }
          actions={
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Link
                  className="flex items-center gap-2"
                  to={getPathWithParams(paths.projects.observe.exportPolicies.detail.edit, {
                    orgId,
                    projectId,
                    exportPolicyId: exportPolicy?.name ?? '',
                  })}>
                  <PencilIcon className="size-4" />
                  Edit
                </Link>
              </Button>
              <MoreActions
                className="border-input bg-background hover:bg-accent hover:text-accent-foreground size-9 rounded-md border px-3"
                actions={[
                  {
                    key: 'delete',
                    label: 'Delete',
                    variant: 'destructive',
                    action: deleteExportPolicy,
                  },
                ]}
              />
            </motion.div>
          }
        />
      </motion.div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="w-1/2">
          <ExportPolicyGeneralCard exportPolicy={exportPolicy} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}>
          <WorkloadSourcesTable data={exportPolicy.sources ?? []} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}>
          <WorkloadSinksTable data={exportPolicy.sinks ?? []} status={exportPolicy.status ?? {}} />
        </motion.div>
      </div>
    </motion.div>
  );
}
