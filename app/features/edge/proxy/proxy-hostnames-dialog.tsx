import { ProxyHostnamesField } from '@/features/edge/proxy/form/hostnames-field';
import { ProxyTlsField } from '@/features/edge/proxy/form/tls-field';
import { type HttpProxy, useUpdateHttpProxy } from '@/resources/http-proxies';
import { httpProxyHostnameSchema } from '@/resources/http-proxies/http-proxy.schema';
import { isIPAddress } from '@/utils/helpers/validation.helper';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { z } from 'zod';

const hostnamesConfigSchema = httpProxyHostnameSchema.extend({
  tlsHostname: z.string().min(1).max(253).optional(),
});

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

  const isIPEndpoint = useMemo(() => {
    if (!proxy?.endpoint) return false;
    try {
      const url = new URL(proxy.endpoint);
      return isIPAddress(url.hostname);
    } catch {
      return false;
    }
  }, [proxy?.endpoint]);

  const show = useCallback((proxyData: HttpProxy) => {
    setProxy(proxyData);
    setProxyName(proxyData.name);
    setDefaultValues({
      hostnames: proxyData.hostnames,
      tlsHostname: proxyData.tlsHostname,
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
      await updateMutation.mutateAsync({
        hostnames: data.hostnames ?? [],
        tlsHostname: data.tlsHostname,
      });
      toast.success('AI Edge', {
        description: 'Hostnames and TLS settings have been updated successfully',
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error('AI Edge', {
        description: (error as Error).message || 'Failed to update hostnames and TLS settings',
      });
      onError?.(error as Error);
    }
  };

  return (
    <Form.Dialog
      open={open}
      onOpenChange={setOpen}
      title="Edit AI Edge Hostnames and TLS"
      description="Configure hostnames and TLS settings for your AI Edge."
      schema={hostnamesConfigSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      submitText="Save"
      submitTextLoading="Saving..."
      className="w-full focus:ring-0 focus:outline-none sm:max-w-xl">
      <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        <div className="flex flex-col gap-5">
          <ProxyHostnamesField
            projectId={projectId}
            proxyDisplayName={proxy?.chosenName ?? proxy?.name}
          />
          <ProxyTlsField required={isIPEndpoint} />
        </div>
      </div>
    </Form.Dialog>
  );
});

ProxyHostnamesConfigDialog.displayName = 'ProxyHostnamesConfigDialog';
