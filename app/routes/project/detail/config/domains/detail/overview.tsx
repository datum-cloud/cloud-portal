import { PageTitle } from '@/components/page-title/page-title';
import { DomainGeneralCard } from '@/features/edge/domain/overview/general-card';
import { QuickSetupCard } from '@/features/edge/domain/overview/quick-setup-card';
import { DomainVerificationCard } from '@/features/edge/domain/overview/verification-card';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
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

  // Track previous status for transition detection
  const previousStatusRef = useRef<ControlPlaneStatus | null>(null);

  const status = useMemo(() => transformControlPlaneStatus(domain?.status), [domain]);
  const isPending = status.status === ControlPlaneStatus.Pending;

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
    <Row gutter={[24, 32]}>
      <Col span={24}>
        <PageTitle title={(domain as IDomainControlResponse)?.domainName ?? 'Domain'} />
      </Col>
      <Col span={24}>
        <DomainGeneralCard domain={domain} dnsZone={dnsZone} projectId={projectId} />
      </Col>
      {isPending && (
        <>
          <Col span={12}>
            <QuickSetupCard domain={domain} projectId={projectId ?? ''} />
          </Col>
          <Col span={12}>
            <DomainVerificationCard domain={domain} />
          </Col>
        </>
      )}
    </Row>
  );
}
