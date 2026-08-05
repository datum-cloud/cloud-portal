import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { type HttpProxy, useDeleteHttpProxy } from '@/resources/http-proxies';
import { useCallback } from 'react';

export function useDeleteProxy(
  projectId: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const { confirm } = useConfirmationDialog();

  const deleteMutation = useDeleteHttpProxy(projectId, {
    onSuccess: () => {
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });

  const confirmDelete = useCallback(
    async (httpProxy: HttpProxy) => {
      const hasCustomHostnames = (httpProxy.hostnames?.length ?? 0) > 0;
      const displayLabel = httpProxy.chosenName || httpProxy.name;

      await confirm({
        title: 'Delete Application Load Balancer',
        description: (
          <span>
            Are you sure you want to delete&nbsp;
            <strong>{displayLabel}</strong>?
          </span>
        ),
        submitText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive',
        showConfirmInput: true,
        showAlert: hasCustomHostnames,
        alertClassName: 'mb-5',
        alertVariant: 'destructive',
        alertTitle: 'DNS records will be removed',
        alertDescription:
          'Any DNS records automatically created for this Application Load Balancer will be deleted. If you want to keep them, remove the hostnames from this Application Load Balancer first.',
        onSubmit: async () => {
          await deleteMutation.mutateAsync(httpProxy.name ?? '');
        },
      });
    },
    [confirm, deleteMutation]
  );

  return {
    confirmDelete,
    isPending: deleteMutation.isPending,
  };
}
