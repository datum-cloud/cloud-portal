import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateFormat } from '@/components/date-format/date-format';
import { MoreActions } from '@/components/more-actions/more-actions';
import { PageTitle } from '@/components/page-title/page-title';
import { TimeDistance } from '@/components/time-distance/time-distance';
import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import { DomainGeneralCard } from '@/features/edge/domain/overview/general-card';
import { QuickSetupCard } from '@/features/edge/domain/overview/quick-setup-card';
import { DomainVerificationCard } from '@/features/edge/domain/overview/verification-card';
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval';
import { dataWithToast } from '@/modules/cookie/toast.server';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { ROUTE_PATH as DOMAINS_ACTIONS_PATH } from '@/routes/api/domains';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { ClockIcon, TrashIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import {
  LoaderFunctionArgs,
  data,
  useFetcher,
  useParams,
  useRouteLoaderData,
  useSearchParams,
} from 'react-router';
import { toast } from 'sonner';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const cloudvalid = url.searchParams.get('cloudvalid') as string;

  if (cloudvalid === 'success') {
    return dataWithToast(null, {
      title: 'DNS setup submitted',
      description: 'Verification is scheduled and will run shortly.',
    });
  }

  return data(null);
};

export default function DomainOverviewPage() {
  const domain = useRouteLoaderData('domain-detail');

  const fetcher = useFetcher({ key: 'delete-domain' });
  const { confirm } = useConfirmationDialog();
  const { projectId } = useParams();

  // revalidate every 10 seconds to keep deployment list fresh
  const revalidator = useRevalidateOnInterval({ enabled: false, interval: 10000 });
  const [searchParams, setSearchParams] = useSearchParams();

  // Track previous status for transition detection
  const previousStatusRef = useRef<ControlPlaneStatus | null>(null);

  const status = useMemo(() => transformControlPlaneStatus(domain?.status), [domain]);
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

  useEffect(() => {
    if (status.status !== ControlPlaneStatus.Pending) {
      revalidator.clear();
    } else {
      revalidator.start();
    }

    return () => {
      revalidator.clear();
    };
  }, [status]);

  // Handle status transitions and show success toast
  useEffect(() => {
    const currentStatus = status.status;
    const previousStatus = previousStatusRef.current;

    // Show success toast when transitioning from Pending to Success
    if (
      previousStatus === ControlPlaneStatus.Pending &&
      currentStatus === ControlPlaneStatus.Success &&
      domain?.name
    ) {
      toast.success('Domain verification completed!', {
        description: `${domain.name} has been successfully verified.`,
      });
    }

    // Update the previous status reference
    previousStatusRef.current = currentStatus;
  }, [status.status, domain?.name]);

  useEffect(() => {
    if (searchParams.get('cloudvalid') === 'success') {
      setSearchParams({});
    }
  }, [searchParams]);

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
              <TimeDistance
                date={(domain as IDomainControlResponse)?.createdAt ?? ''}
                className="text-muted-foreground text-sm"
              />
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
                    icon: <TrashIcon />,
                    action: deleteDomain,
                  },
                ]}
              />
            </motion.div>
          }
        />
      </motion.div>

      {/*       {status.status === ControlPlaneStatus.Pending && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mx-auto w-full max-w-6xl">
          <ConditionsAlert status={domain.status} />
        </motion.div>
      )} */}

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}>
          <DomainGeneralCard domain={domain} />
        </motion.div>
        {status.status === ControlPlaneStatus.Pending && (
          <div className="flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}>
              <QuickSetupCard domain={domain} projectId={projectId ?? ''} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.4 }}>
              <DomainVerificationCard domain={domain} />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
