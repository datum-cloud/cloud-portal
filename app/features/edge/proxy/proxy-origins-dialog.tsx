import { ProtocolEndpointInput } from '@/features/edge/proxy/form/protocol-endpoint-input';
import { type HttpProxy, useUpdateHttpProxy } from '@/resources/http-proxies';
import { toast } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { z } from 'zod';

const originsConfigSchema = z.object({
  protocol: z.enum(['http', 'https']).default('https'),
  endpointHost: z.string().min(1, 'Origin is required'),
});

type OriginsConfigSchema = z.infer<typeof originsConfigSchema>;

export interface ProxyOriginsDialogRef {
  show: (proxy: HttpProxy) => void;
  hide: () => void;
}

interface ProxyOriginsDialogProps {
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const ProxyOriginsDialog = forwardRef<ProxyOriginsDialogRef, ProxyOriginsDialogProps>(
  ({ projectId, onSuccess, onError }, ref) => {
    const [open, setOpen] = useState(false);
    const [proxyName, setProxyName] = useState('');
    const [proxy, setProxy] = useState<HttpProxy | null>(null);
    const [defaultValues, setDefaultValues] = useState<Partial<OriginsConfigSchema>>();

    const updateMutation = useUpdateHttpProxy(projectId, proxyName);

    const show = useCallback((proxyData: HttpProxy) => {
      setProxy(proxyData);
      setProxyName(proxyData.name);

      // Parse existing endpoint to extract protocol and hostname:port
      let protocol: 'http' | 'https' = 'https';
      let endpointHost = '';

      if (proxyData.endpoint) {
        try {
          const url = new URL(proxyData.endpoint);
          protocol = url.protocol === 'http:' ? 'http' : 'https';
          endpointHost = url.port ? `${url.hostname}:${url.port}` : url.hostname;
        } catch {
          // If parsing fails, try to extract protocol manually
          if (proxyData.endpoint.startsWith('http://')) {
            protocol = 'http';
            endpointHost = proxyData.endpoint.replace(/^https?:\/\//, '');
          } else if (proxyData.endpoint.startsWith('https://')) {
            protocol = 'https';
            endpointHost = proxyData.endpoint.replace(/^https?:\/\//, '');
          } else {
            endpointHost = proxyData.endpoint;
          }
        }
      }

      setDefaultValues({
        protocol,
        endpointHost,
      });
      setOpen(true);
    }, []);

    const hide = useCallback(() => {
      setOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const handleSubmit = async (data: OriginsConfigSchema) => {
      if (!proxy) return;

      // Combine protocol and endpointHost into full endpoint URL
      const fullEndpoint = `${data.protocol}://${data.endpointHost}`;

      try {
        await updateMutation.mutateAsync({
          endpoint: fullEndpoint,
        });
        toast.success('AI Edge', {
          description: 'Origin has been updated successfully',
        });
        setOpen(false);
        onSuccess?.();
      } catch (error) {
        toast.error('AI Edge', {
          description: (error as Error).message || 'Failed to update origin',
        });
        onError?.(error as Error);
      }
    };

    return (
      <Form.Dialog
        open={open}
        onOpenChange={setOpen}
        title="Edit AI Edge Origin"
        description="Update the origin endpoint where your service is running."
        schema={originsConfigSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitText="Save"
        submitTextLoading="Saving..."
        className="w-full focus:ring-0 focus:outline-none sm:max-w-2xl">
        <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field
            tooltip="Origin is the hostname or IP address where your service is running"
            name="endpointHost"
            label="Origin"
            required>
            <ProtocolEndpointInput autoFocus />
          </Form.Field>
        </div>
      </Form.Dialog>
    );
  }
);

ProxyOriginsDialog.displayName = 'ProxyOriginsDialog';
