import { ProxyHostnamesField } from '@/features/edge/proxy/form/hostnames-field';
import { showMutationErrorToast } from '@/modules/quota';
import { type HttpProxy, useUpdateHttpProxy } from '@/resources/http-proxies';
import { httpProxyHostnameSchema } from '@/resources/http-proxies/http-proxy.schema';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { z } from 'zod';

// The origin TLS (SNI) hostname is edited on the TLS & Certificates card, not here.
const hostnamesConfigSchema = httpProxyHostnameSchema;

type HostnamesConfigSchema = z.infer<typeof hostnamesConfigSchema>;

export interface ProxyHostnamesConfigDialogRef {
  show: (proxy: HttpProxy) => void;
  hide: () => void;
}

interface ProxyHostnamesConfigDialogProps {
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const ProxyHostnamesConfigDialog = forwardRef<
  ProxyHostnamesConfigDialogRef,
  ProxyHostnamesConfigDialogProps
>(({ projectId, onSuccess, onError }, ref) => {
  const [open, setOpen] = useState(false);
  const [proxyName, setProxyName] = useState('');
  const [proxy, setProxy] = useState<HttpProxy | null>(null);
  const [defaultValues, setDefaultValues] = useState<Partial<HostnamesConfigSchema>>();

  const updateMutation = useUpdateHttpProxy(projectId, proxyName);

  const show = useCallback((proxyData: HttpProxy) => {
    setProxy(proxyData);
    setProxyName(proxyData.name);
    setDefaultValues({
      hostnames: proxyData.hostnames && proxyData.hostnames.length > 0 ? proxyData.hostnames : [''],
    });
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

  const handleSubmit = async (data: HostnamesConfigSchema) => {
    if (!proxy) return;

    try {
      // Only hostnames change here; the backend rule (endpoint, TLS hostname,
      // Host header, HSTS) is preserved by the adapter.
      await updateMutation.mutateAsync({ hostnames: data.hostnames ?? [] });
      toast.success('Application Load Balancer', {
        description: 'Hostnames have been updated successfully',
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      showMutationErrorToast(error, {
        fallbackTitle: 'Application Load Balancer',
        fallbackDescription: (error as Error).message || 'Failed to update hostnames',
        scope: 'project',
        projectId,
      });
      onError?.(error as Error);
    }
  };

  return (
    <Form.Dialog
      open={open}
      onOpenChange={setOpen}
      title="Edit custom hostnames"
      description="Configure the hostnames this Application Load Balancer answers on."
      schema={hostnamesConfigSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      submitText="Save"
      submitTextLoading="Saving..."
      className="w-full focus:ring-0 focus:outline-none sm:max-w-xl">
      <div className="px-5">
        <ProxyHostnamesField
          projectId={projectId}
          proxyDisplayName={proxy?.chosenName ?? proxy?.name}
        />
      </div>
    </Form.Dialog>
  );
});

ProxyHostnamesConfigDialog.displayName = 'ProxyHostnamesConfigDialog';
