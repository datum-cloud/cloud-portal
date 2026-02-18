import { ProxyHostnamesField } from '@/features/edge/proxy/form/hostnames-field';
import { ProxyTlsField } from '@/features/edge/proxy/form/tls-field';
import { type HttpProxy, useUpdateHttpProxy } from '@/resources/http-proxies';
import { httpProxyHostnameSchema } from '@/resources/http-proxies/http-proxy.schema';
import { toast } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { z } from 'zod';

const advancedConfigSchema = httpProxyHostnameSchema.extend({
  tlsHostname: z.string().min(1).max(253).optional(),
});

type AdvancedConfigSchema = z.infer<typeof advancedConfigSchema>;

export interface ProxyAdvancedConfigDialogRef {
  show: (proxy: HttpProxy) => void;
  hide: () => void;
}

interface ProxyAdvancedConfigDialogProps {
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const ProxyAdvancedConfigDialog = forwardRef<
  ProxyAdvancedConfigDialogRef,
  ProxyAdvancedConfigDialogProps
>(({ projectId, onSuccess, onError }, ref) => {
  const [open, setOpen] = useState(false);
  const [proxyName, setProxyName] = useState('');
  const [proxy, setProxy] = useState<HttpProxy | null>(null);
  const [defaultValues, setDefaultValues] = useState<Partial<AdvancedConfigSchema>>();

  const updateMutation = useUpdateHttpProxy(projectId, proxyName);

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

  const handleSubmit = async (data: AdvancedConfigSchema) => {
    if (!proxy) return;

    try {
      await updateMutation.mutateAsync({
        hostnames: data.hostnames,
        tlsHostname: data.tlsHostname,
        endpoint: proxy.endpoint ?? '', // Required field, use existing value
        chosenName: proxy.chosenName, // Required field, use existing value
      });
      toast.success('AI Edge', {
        description: 'Advanced configuration has been updated successfully',
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error('AI Edge', {
        description: (error as Error).message || 'Failed to update advanced configuration',
      });
      onError?.(error as Error);
    }
  };

  return (
    <Form.Dialog
      open={open}
      onOpenChange={setOpen}
      title="Edit Advanced Config"
      description="Configure hostnames and TLS settings for your Edge endpoint."
      schema={advancedConfigSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      submitText="Save"
      submitTextLoading="Saving..."
      className="w-full focus:ring-0 focus:outline-none sm:max-w-2xl">
      <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        <div className="flex flex-col gap-5">
          <ProxyHostnamesField projectId={projectId} />
          <ProxyTlsField />
        </div>
      </div>
    </Form.Dialog>
  );
});

ProxyAdvancedConfigDialog.displayName = 'ProxyAdvancedConfigDialog';
