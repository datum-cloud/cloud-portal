import { DateTime } from '@/components/date-time';
import { useResourcePermissions } from '@/modules/rbac';
import type { Domain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
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
    <Alert variant="success" data-e2e="domain-ready-notice">
      <Icon icon={CircleCheckIcon} className="size-4" />
      <AlertTitle className="text-sm">Ready to use as a custom hostname</AlertTitle>
      <AlertDescription>
        <div className="flex flex-col gap-3">
          <span>
            Datum confirmed you own {domain.domainName}. You can serve traffic on it and any of its
            subdomains, for example app.{domain.domainName}, from an ALB.
            {verifiedAt && (
              <>
                {' '}
                Verified <DateTime variant="relative" addSuffix date={verifiedAt} />.
              </>
            )}
          </span>
          {canCreateProxy && (
            <div>
              <LinkButton
                as={Link}
                href={getPathWithParams(
                  paths.project.detail.proxy.root,
                  { projectId },
                  new URLSearchParams({ action: 'create' })
                )}
                size="xs"
                type="secondary"
                theme="outline">
                Create an ALB
              </LinkButton>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
