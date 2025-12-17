import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { MoreActions } from '@/components/more-actions/more-actions';
import { PageTitle } from '@/components/page-title/page-title';
import { ExportPolicyGeneralCard } from '@/features/metric/export-policies/general-card';
import { WorkloadSinksTable } from '@/features/metric/export-policies/sinks-table';
import { WorkloadSourcesTable } from '@/features/metric/export-policies/sources-table';
import { useRevalidation } from '@/hooks/useRevalidation';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { ROUTE_PATH as EXPORT_POLICIES_ACTIONS_ROUTE_PATH } from '@/routes/api/export-policies/';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-ui/components';
import { ClockIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, MetaFunction, useFetcher, useParams, useRouteLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find((match) => match.id === 'export-policy-detail') as any;

  const exportPolicy = match.data;
  return metaObject((exportPolicy as IExportPolicyControlResponse)?.name || 'Export Policy');
});

export default function ExportPolicyOverview() {
  const exportPolicy = useRouteLoaderData('export-policy-detail');

  const fetcher = useFetcher();
  const { confirm } = useConfirmationDialog();
  const { projectId } = useParams();

  // Revalidate every 10 seconds to keep deployment list fresh
  const { stop: stopRevalidation } = useRevalidation({
    interval: 10000,
  });

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
        // Stop revalidation when deleting an export policy
        stopRevalidation();

        await fetcher.submit(
          {
            id: exportPolicy?.name ?? '',
            projectId: projectId ?? '',
            redirectUri: getPathWithParams(paths.project.detail.metrics.exportPolicies.root, {
              projectId,
            }),
          },
          {
            action: EXPORT_POLICIES_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
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
        className="mx-auto flex w-full flex-col gap-6">
        <PageTitle
          title={(exportPolicy as IExportPolicyControlResponse)?.name ?? 'Export Policy'}
          description={
            <div className="flex items-center gap-1">
              <ClockIcon className="text-muted-foreground h-4 w-4" />
              <DateTime
                className="text-muted-foreground text-sm"
                date={(exportPolicy as IExportPolicyControlResponse)?.createdAt ?? ''}
                variant="both"
              />
            </div>
          }
          actions={
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="flex items-center gap-2">
              <Button type="quaternary" theme="outline" size="small">
                <Link
                  className="flex items-center gap-2"
                  to={getPathWithParams(paths.project.detail.metrics.exportPolicies.detail.edit, {
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
                    icon: <TrashIcon />,
                    action: deleteExportPolicy,
                  },
                ]}
              />
            </motion.div>
          }
        />
      </motion.div>

      <div className="mx-auto flex w-full flex-col gap-6">
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
