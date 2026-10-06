import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { showDomainInUseToast } from '@/features/edge/domain/domain-in-use-toast';
import { showMutationErrorToast } from '@/modules/quota';
import { useResourcePermissions } from '@/modules/rbac';
import { type DnsZone } from '@/resources/dns-zones';
import {
  type Domain,
  getRefreshCooldownMessage,
  useDeleteDomain,
  useDomain,
  useDomainWatch,
  useRefreshCooldown,
  useRefreshDomainRegistration,
} from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { isDomainInUseByDnsZoneError } from '@/utils/errors/domain-in-use-error';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { GlobeIcon, RefreshCcwIcon, TrashIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

interface DomainHeaderActionsProps {
  projectId: string;
  domain: Domain;
  dnsZone?: DnsZone | null;
}

export function DomainHeaderActions({ projectId, domain, dnsZone }: DomainHeaderActionsProps) {
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  // Live domain data from React Query (seeded by parent layout's useDomain call)
  const { data: liveDomain } = useDomain(projectId, domain?.name ?? '', {
    enabled: !!domain?.name,
    initialData: domain,
  });
  // Subscribe to real-time domain updates
  useDomainWatch(projectId, liveDomain?.name ?? domain?.name ?? '', {
    enabled: !!(liveDomain?.name ?? domain?.name),
  });

  const effectiveDomain = liveDomain ?? domain;
  const { remainingSeconds, isOnCooldown } = useRefreshCooldown(
    effectiveDomain?.desiredRegistrationRefreshAttempt
  );

  const deleteDomainMutation = useDeleteDomain(projectId, {
    onSuccess: () => {
      navigate(
        getPathWithParams(paths.project.detail.domains.root, {
          projectId,
        })
      );
    },
    onError: (error) => {
      if (isDomainInUseByDnsZoneError(error)) {
        showDomainInUseToast({ projectId, dnsZoneName: dnsZone?.name, navigate });
        return;
      }
      showMutationErrorToast(error, { fallbackTitle: 'Domain', scope: 'project', projectId });
    },
  });

  const refreshDomainMutation = useRefreshDomainRegistration(projectId, {
    onSuccess: () => {
      toast.success('Domain', {
        description: 'The domain has been refreshed successfully',
      });
    },
    onError: (error) => {
      showMutationErrorToast(error, { fallbackTitle: 'Domain', scope: 'project', projectId });
    },
  });

  const { canUpdate, canDelete, canViewDnsZones, canCreateDnsZones } = useResourcePermissions({
    resource: 'domains',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['update', 'delete'],
    subResources: [
      {
        resource: 'dnszones',
        group: 'dns.networking.miloapis.com',
        scope: 'project',
        alias: 'dnsZones',
        verbs: ['list', 'create'],
      },
    ],
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

  if (!effectiveDomain?.name) return null;

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      {canUpdate && (
        <Tooltip message={getRefreshCooldownMessage(remainingSeconds)} hidden={!isOnCooldown}>
          <span
            aria-disabled={isOnCooldown}
            className={cn(
              'inline-block',
              isOnCooldown && 'cursor-not-allowed [&>*]:pointer-events-none'
            )}>
            <Button
              type="secondary"
              theme="outline"
              size="small"
              loading={refreshDomainMutation.isPending}
              disabled={isOnCooldown}
              onClick={handleRefreshDomain}
              aria-label="Refresh domain">
              <Icon icon={RefreshCcwIcon} size={14} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </span>
        </Tooltip>
      )}
      {(dnsZone ? canViewDnsZones : canCreateDnsZones) && (
        <Button
          type="secondary"
          theme="outline"
          size="small"
          className="flex-1 sm:flex-initial"
          onClick={handleManageDnsZone}>
          <Icon icon={GlobeIcon} size={14} />
          {dnsZone ? 'Manage DNS Zone' : 'Set up DNS Zone'}
        </Button>
      )}
      {canDelete && (
        <Button
          type="danger"
          theme="outline"
          size="small"
          loading={deleteDomainMutation.isPending}
          onClick={handleDeleteDomain}
          data-e2e="delete-domain-button"
          aria-label="Delete domain">
          <Icon icon={TrashIcon} size={14} />
          <span className="hidden sm:inline">Delete</span>
        </Button>
      )}
    </div>
  );
}
