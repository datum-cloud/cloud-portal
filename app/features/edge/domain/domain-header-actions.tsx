import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { type DnsZone } from '@/resources/dns-zones';
import {
  type Domain,
  useDeleteDomain,
  useDomain,
  useDomainWatch,
  useRefreshDomainRegistration,
} from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
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

  const deleteDomainMutation = useDeleteDomain(projectId, {
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

  const refreshDomainMutation = useRefreshDomainRegistration(projectId, {
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

  if (!effectiveDomain?.name) return null;

  return (
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
  );
}
