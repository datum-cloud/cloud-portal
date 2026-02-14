import { PageTitle } from '@/components/page-title/page-title';
import { DomainGeneralCard } from '@/features/edge/domain/overview/general-card';
import { QuickSetupCard } from '@/features/edge/domain/overview/quick-setup-card';
import { DomainVerificationCard } from '@/features/edge/domain/overview/verification-card';
import { ControlPlaneStatus } from '@/resources/base';
import { useDomain, useDomainWatch } from '@/resources/domains';
import { dataWithToast } from '@/utils/cookies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Col, Row, toast } from '@datum-ui/components';
import { useMemo, useRef, useEffect } from 'react';
import {
  LoaderFunctionArgs,
  data,
  useParams,
  useRouteLoaderData,
  useSearchParams,
} from 'react-router';

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

  const [searchParams, setSearchParams] = useSearchParams();

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
        <PageTitle title={effectiveDomain?.domainName ?? 'Domain'} />
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
    </Row>
  );
}
