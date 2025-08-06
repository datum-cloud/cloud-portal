import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateFormat } from '@/components/date-format/date-format';
import { MoreActions } from '@/components/more-actions/more-actions';
import { PageTitle } from '@/components/page-title/page-title';
import { paths } from '@/config/paths';
import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import { DomainGeneralCard } from '@/features/edge/domain/overview/general-card';
import { DomainVerificationCard } from '@/features/edge/domain/overview/verification-card';
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { ROUTE_PATH as DOMAINS_ACTIONS_PATH } from '@/routes/api/domains';
import { getPathWithParams } from '@/utils/path';
import { formatDistanceToNow } from 'date-fns';
import { ClockIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { useFetcher, useParams, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export default function DomainOverviewPage() {
  const domain = useRouteLoaderData('domain-detail');

  const fetcher = useFetcher({ key: 'delete-domain' });
  const { confirm } = useConfirmationDialog();
  const { projectId } = useParams();

  // revalidate every 10 seconds to keep deployment list fresh
  const revalidator = useRevalidateOnInterval({ enabled: true, interval: 10000 });

  const deleteDomain = async () => {
    await confirm({
      title: 'Delete Domain',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{domain?.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        // Clear the interval when deleting a export policy
        revalidator.clear();

        await fetcher.submit(
          {
            id: domain?.name ?? '',
            projectId: projectId ?? '',
            redirectUri: getPathWithParams(paths.project.detail.domains.root, {
              projectId,
            }),
          },
          {
            action: DOMAINS_ACTIONS_PATH,
            method: 'DELETE',
          }
        );
      },
    });
  };

  const status = useMemo(() => transformControlPlaneStatus(domain?.status), [domain]);

  useEffect(() => {
    if (status.status !== ControlPlaneStatus.Pending) {
      revalidator.clear();
    }

    return () => {
      revalidator.clear();
    };
  }, [status]);

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
          title={(domain as IDomainControlResponse)?.name ?? 'Domain'}
          description={
            <div className="flex items-center gap-1">
              <ClockIcon className="text-muted-foreground h-4 w-4" />
              <DateFormat
                className="text-muted-foreground text-sm"
                date={(domain as IDomainControlResponse)?.createdAt ?? ''}
              />
              <span className="text-muted-foreground text-sm">
                (
                {formatDistanceToNow(
                  new Date((domain as IDomainControlResponse)?.createdAt ?? ''),
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
              <MoreActions
                className="border-input bg-background hover:bg-accent hover:text-accent-foreground size-9 rounded-md border px-3"
                actions={[
                  {
                    key: 'delete',
                    label: 'Delete',
                    variant: 'destructive',
                    action: deleteDomain,
                  },
                ]}
              />
            </motion.div>
          }
        />
      </motion.div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}>
          <DomainGeneralCard domain={domain} />
        </motion.div>
        {status.status === ControlPlaneStatus.Pending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}>
            <DomainVerificationCard domain={domain} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
