import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DomainGeneralCard } from '@/features/edge/domain/overview/general-card';
import { QuickSetupCard } from '@/features/edge/domain/overview/quick-setup-card';
import { DomainVerificationCard } from '@/features/edge/domain/overview/verification-card';
import { NotesSection } from '@/features/notes';
import { ControlPlaneStatus } from '@/resources/base';
import {
  useDeleteDomain,
  useDomain,
  useDomainWatch,
  useRefreshDomainRegistration,
} from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { dataWithToast } from '@/utils/cookies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { toast } from '@datum-cloud/datum-ui/toast';
import { RefreshCcwIcon, GlobeIcon, TrashIcon } from 'lucide-react';
import { useMemo, useRef, useEffect } from 'react';
import {
  LoaderFunctionArgs,
  data,
  useNavigate,
  useParams,
  useRouteLoaderData,
  useSearchParams,
} from 'react-router';

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
  const { domain, dnsZone } = useRouteLoaderData('domain-detail');
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm } = useConfirmationDialog();

  // Get live domain data from React Query
  const { data: liveDomain } = useDomain(projectId ?? '', domain?.name ?? '', {
    enabled: !!domain?.name,
    initialData: domain,
  });
  // Subscribe to real-time domain updates (for nameserver status)
  useDomainWatch(projectId ?? '', liveDomain?.name ?? domain?.name ?? '', {
    enabled: !!(liveDomain?.name ?? domain?.name),
  });

  // Prefer live data from React Query, fall back to SSR loader data
  const effectiveDomain = liveDomain ?? domain;

  const deleteDomainMutation = useDeleteDomain(projectId ?? '', {
    onSuccess: () => {
      navigate(
        getPathWithParams(paths.project.detail.domains.root, {
          projectId,
        })
      );
    },
    onError: (error) => {
      toast.error('Domain', { description: error.message || 'Failed to delete domain' });
    },
  });

  const refreshDomainMutation = useRefreshDomainRegistration(projectId ?? '', {
    onSuccess: () => {
      toast.success('Domain', {
        description: 'The domain has been refreshed successfully',
      });
    },
    onError: (error) => {
      toast.error('Domain', {
        description: error.message || 'Failed to refresh domain',
      });
    },
  });

  const handleRefreshDomain = () => {
    if (!effectiveDomain?.name) return;
    refreshDomainMutation.mutate(effectiveDomain.name);
  };

  const handleManageDnsZone = () => {
    if (!effectiveDomain?.domainName) return;

    if (dnsZone) {
      navigate(
        getPathWithParams(paths.project.detail.dnsZones.detail.root, {
          projectId,
          dnsZoneId: dnsZone.name ?? '',
        })
      );
      return;
    }

    navigate(
      getPathWithParams(
        paths.project.detail.dnsZones.root,
        {
          projectId,
        },
        new URLSearchParams({
          action: 'create',
          domainName: effectiveDomain.domainName,
        })
      )
    );
  };

  const handleDeleteDomain = async () => {
    if (!effectiveDomain?.name) return;

    await confirm({
      title: 'Delete Domain',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{effectiveDomain.domainName}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: false,
      onSubmit: async () => {
        deleteDomainMutation.mutate(effectiveDomain.name);
      },
    });
  };

  // Track previous status for transition detection
  const previousStatusRef = useRef<ControlPlaneStatus | null>(null);

  const status = useMemo(
    () => transformControlPlaneStatus(effectiveDomain?.status),
    [effectiveDomain]
  );
  const isPending = useMemo(() => status.status === ControlPlaneStatus.Pending, [status]);

  // Handle status transitions and show success toast
  useEffect(() => {
    const currentStatus = status.status;
    const previousStatus = previousStatusRef.current;

    // Show success toast when transitioning from Pending to Success
    if (
      previousStatus === ControlPlaneStatus.Pending &&
      currentStatus === ControlPlaneStatus.Success &&
      effectiveDomain?.name
    ) {
      toast.success('Domain verification completed!', {
        description: `${effectiveDomain.name} has been successfully verified.`,
      });
    }

    // Update the previous status reference
    previousStatusRef.current = currentStatus;
  }, [status.status, effectiveDomain?.name]);

  useEffect(() => {
    if (searchParams.get('cloudvalid') === 'success') {
      setSearchParams({});
    }
  }, [searchParams]);

  return (
    <Row gutter={[24, 32]}>
      <Col span={24}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageTitle title={effectiveDomain?.domainName ?? 'Domain'} />
          {effectiveDomain?.name && (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                type="secondary"
                theme="outline"
                size="small"
                loading={refreshDomainMutation.isPending}
                onClick={handleRefreshDomain}
                aria-label="Refresh domain">
                <Icon icon={RefreshCcwIcon} size={14} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                type="secondary"
                theme="outline"
                size="small"
                className="flex-1 sm:flex-initial"
                onClick={handleManageDnsZone}>
                <Icon icon={GlobeIcon} size={14} />
                Manage DNS Zone
              </Button>
              <Button
                type="danger"
                theme="outline"
                size="small"
                loading={deleteDomainMutation.isPending}
                onClick={handleDeleteDomain}
                aria-label="Delete domain">
                <Icon icon={TrashIcon} size={14} />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          )}
        </div>
      </Col>
      <Col span={24}>
        <DomainGeneralCard domain={effectiveDomain} dnsZone={dnsZone} projectId={projectId} />
      </Col>
      {isPending && (
        <>
          <Col span={24} xs={{ span: 24 }} sm={{ span: 24 }} md={{ span: 24 }} lg={{ span: 12 }}>
            <QuickSetupCard domain={effectiveDomain} projectId={projectId ?? ''} />
          </Col>
          <Col span={24} xs={{ span: 24 }} sm={{ span: 24 }} md={{ span: 24 }} lg={{ span: 12 }}>
            <DomainVerificationCard domain={effectiveDomain} />
          </Col>
        </>
      )}
      <Col span={24}>
        <NotesSection
          projectId={projectId ?? ''}
          subjectRef={{
            apiGroup: 'networking.datumapis.com',
            kind: 'Domain',
            name: effectiveDomain?.name ?? '',
          }}
        />
      </Col>
    </Row>
  );
}
