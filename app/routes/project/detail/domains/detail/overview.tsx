import { ResourceActivityFeed, useProjectActivityClient } from '@/features/activity';
import { DomainGeneralCard } from '@/features/edge/domain/overview/general-card';
import { DomainReadyCard } from '@/features/edge/domain/overview/ready-card';
import { DomainVerificationCard } from '@/features/edge/domain/overview/verification-card';
import { NotesList } from '@/features/notes';
import { ResourceColumnFrame } from '@/features/project/home/resource-column';
import { useGuardedRouteData, useResourcePermissions } from '@/modules/rbac';
import { ControlPlaneStatus } from '@/resources/base';
import { type DnsZone } from '@/resources/dns-zones';
import { type Domain, useDomain, useDomainWatch } from '@/resources/domains';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export default function DomainOverviewPage() {
  const { data: domain, companions } = useGuardedRouteData<Domain, { dnsZone: DnsZone | null }>(
    'domain-detail'
  );
  const dnsZone = companions.dnsZone;
  const { projectId } = useParams();

  const { client: activityClient, resourceLinkResolver } = useProjectActivityClient();

  const { canList: canViewNotes } = useResourcePermissions({
    resource: 'notes',
    group: 'notes.miloapis.com',
    scope: 'project',
    verbs: ['list'],
  });

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
  const isVerified = status.status === ControlPlaneStatus.Success;

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

  return (
    <Row gutter={[24, 32]}>
      <Col span={24}>
        {isVerified ? (
          <DomainReadyCard domain={effectiveDomain} projectId={projectId ?? ''} />
        ) : (
          <DomainVerificationCard domain={effectiveDomain} projectId={projectId ?? ''} />
        )}
      </Col>
      <Col span={24}>
        <DomainGeneralCard
          domain={effectiveDomain}
          dnsZone={dnsZone ?? undefined}
          projectId={projectId}
          notes={
            canViewNotes ? (
              <NotesList
                projectId={projectId ?? ''}
                subjectRef={{
                  apiGroup: 'networking.datumapis.com',
                  kind: 'Domain',
                  name: effectiveDomain?.name ?? '',
                }}
              />
            ) : (
              <Text size="sm" textColor="muted">
                You don&apos;t have permission to view notes for this domain.
              </Text>
            )
          }
        />
      </Col>
      <Col span={24}>
        <ResourceColumnFrame title="Activity" bodyClassName="h-auto">
          <ResourceActivityFeed
            client={activityClient}
            resourceLinkResolver={resourceLinkResolver}
            resourceKinds={['Domain']}
            resourceName={effectiveDomain?.name}
            compact={false}
            variant="digest"
            pageSize={10}
            urlSync={false}
            // The activity API caps one query at 30 days (and keeps 60), so
            // reach as far back as it allows instead of the 7-day default.
            feedProps={{ showFilters: false, initialTimeRange: { start: 'now-30d' } }}
          />
        </ResourceColumnFrame>
      </Col>
    </Row>
  );
}
