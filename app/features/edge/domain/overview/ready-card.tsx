import { DateTime } from '@/components/date-time';
import { useResourcePermissions } from '@/modules/rbac';
import type { Domain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { CircleCheckIcon } from 'lucide-react';
import { Link } from 'react-router';

type Condition = { type?: string; status?: string; lastTransitionTime?: string };

/**
 * Shown in place of the verification steps once the domain is verified: says
 * what verification unlocks and links to where the hostname gets used.
 */
export const DomainReadyCard = ({ domain, projectId }: { domain: Domain; projectId: string }) => {
  const verifiedAt = (domain.status?.conditions as Condition[] | undefined)?.find(
    (c) => c.type === 'Verified' && c.status === 'True'
  )?.lastTransitionTime;

  const { canCreate: canCreateProxy } = useResourcePermissions({
    resource: 'httpproxies',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['create'],
  });

  return (
    <div className="bg-card-success border-card-success-border flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Icon icon={CircleCheckIcon} size={20} className="text-success mt-0.5 shrink-0" />
        <div className="flex flex-col gap-1">
          <Text as="p" weight="medium">
            Ready to use as a custom hostname
          </Text>
          <Text as="p" size="sm">
            Datum confirmed you own <span className="font-medium">{domain.domainName}</span>. You
            can serve traffic on it and any of its subdomains, for example{' '}
            <Text as="span" size="xs" className="font-mono">
              app.{domain.domainName}
            </Text>
            , from an ALB.
          </Text>
          {verifiedAt && (
            <Text size="xs" textColor="muted">
              Verified <DateTime variant="relative" addSuffix date={verifiedAt} />
            </Text>
          )}
        </div>
      </div>
      {canCreateProxy && (
        <LinkButton
          as={Link}
          type="secondary"
          theme="outline"
          size="small"
          className="shrink-0"
          href={getPathWithParams(
            paths.project.detail.proxy.root,
            { projectId },
            new URLSearchParams({ action: 'create' })
          )}>
          Create an ALB
        </LinkButton>
      )}
    </div>
  );
};
