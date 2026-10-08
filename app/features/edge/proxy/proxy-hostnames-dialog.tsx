import { ProxyHostnamesField } from '@/features/edge/proxy/form/hostnames-field';
import { getUnverifiedHostnameError } from '@/features/edge/proxy/utils/hostname-verification';
import { showMutationErrorToast } from '@/modules/quota';
import { type Domain, useDomains } from '@/resources/domains';
import { type HttpProxy, useUpdateHttpProxy } from '@/resources/http-proxies';
import { httpProxyHostnameSchema } from '@/resources/http-proxies/http-proxy.schema';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { z } from 'zod';

// The origin TLS (SNI) hostname is edited on the TLS & Certificates card, not here.
// Hostnames already on the proxy are left alone so other edits can still be
// saved; anything new has to sit under a verified domain, or the proxy gets
// stuck in Programming.
const createHostnamesConfigSchema = (
  domains: Pick<Domain, 'domainName' | 'status'>[],
  existingHostnames: string[]
) =>
  httpProxyHostnameSchema.superRefine((data, ctx) => {
    data.hostnames?.forEach((hostname, index) => {
      if (!hostname || existingHostnames.includes(hostname)) return;
      const message = getUnverifiedHostnameError(hostname, domains);
      if (message) ctx.addIssue({ code: 'custom', path: ['hostnames', index], message });
    });
  });

type HostnamesConfigSchema = z.infer<typeof httpProxyHostnameSchema>;

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
  const { data: domains = [] } = useDomains(projectId);
  const hostnamesConfigSchema = useMemo(
    () => createHostnamesConfigSchema(domains, proxy?.hostnames ?? []),
    [domains, proxy?.hostnames]
  );

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
