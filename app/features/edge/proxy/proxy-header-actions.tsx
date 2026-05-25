import { useDeleteProxy } from '@/features/edge/proxy/hooks/use-delete-proxy';
import { PermissionButton } from '@/modules/rbac';
import { type HttpProxy, useHttpProxy, useHttpProxyWatch } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Trash2Icon } from 'lucide-react';
import { useNavigate } from 'react-router';

interface ProxyHeaderActionsProps {
  projectId: string;
  proxy: HttpProxy;
}

export function ProxyHeaderActions({ projectId, proxy }: ProxyHeaderActionsProps) {
  const navigate = useNavigate();

  // Live proxy data from React Query (seeded by parent layout's useHttpProxy call)
  const { data: liveProxy } = useHttpProxy(projectId, proxy?.name ?? '', {
    enabled: !!proxy?.name,
    initialData: proxy,
  });
  // Subscribe to real-time proxy updates
  useHttpProxyWatch(projectId, liveProxy?.name ?? proxy?.name ?? '', {
    enabled: !!(liveProxy?.name ?? proxy?.name),
  });

  const effectiveProxy = liveProxy ?? proxy;

  const { confirmDelete, isPending: isDeleting } = useDeleteProxy(projectId, {
    onSuccess: () => {
      navigate(getPathWithParams(paths.project.detail.proxy.root, { projectId }));
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete proxy');
    },
  });

  if (!effectiveProxy?.name) return null;

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <PermissionButton
        resource="httpproxies"
        verb="delete"
        group="networking.datumapis.com"
        namespace="default"
        scope="project"
        deniedReason="You don't have permission to delete this AI Edge"
        type="danger"
        theme="outline"
        size="small"
        loading={isDeleting}
        onClick={() => confirmDelete(effectiveProxy)}
        aria-label="Delete AI Edge">
        <Icon icon={Trash2Icon} size={14} />
        <span className="hidden sm:inline">Delete</span>
      </PermissionButton>
    </div>
  );
}
