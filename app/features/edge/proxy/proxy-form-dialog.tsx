import { ProtocolEndpointInput } from '@/features/edge/proxy/form/protocol-endpoint-input';
import { ProxyTlsField } from '@/features/edge/proxy/form/tls-field';
import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import {
  type HttpProxySchema,
  httpProxySchema,
  useCreateHttpProxy,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { useNavigate } from 'react-router';

export interface HttpProxyFormDialogRef {
  show: () => void;
  hide: () => void;
}

interface HttpProxyFormDialogProps {
  projectId: string;
  onError?: (error: Error) => void;
}

export const HttpProxyFormDialog = forwardRef<HttpProxyFormDialogRef, HttpProxyFormDialogProps>(
  ({ projectId, onError }, ref) => {
    const [open, setOpen] = useState(false);
    const [nameRandomSuffix] = useState(() => generateRandomString(6));
    const [isIPOrigin, setIsIPOrigin] = useState(false);

    const navigate = useNavigate();
    const { trackAction } = useAnalytics();

    const createProxyMutation = useCreateHttpProxy(projectId, {
      onSuccess: (createdProxy) => {
        trackAction(AnalyticsAction.AddProxy);
        navigate(
          getPathWithParams(paths.project.detail.proxy.detail.root, {
            projectId,
            proxyId: createdProxy.name,
          })
        );
      },
      onError: (error) => {
        toast.error('AI Edge', {
          description: error.message || 'Failed to create AI Edge',
        });
        onError?.(error);
      },
    });

    const defaultValues: Partial<HttpProxySchema> = {
      protocol: 'https',
      trafficProtectionMode: 'Enforce',
      paranoiaLevelBlocking: 1,
      enableHttpRedirect: true,
    };

    const show = useCallback(() => {
      setOpen(true);
    }, []);

    const hide = useCallback(() => {
      setOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const handleSubmit = (data: HttpProxySchema) => {
      const protocol = data.protocol || 'https';
      const fullEndpoint = `${protocol}://${data.endpointHost}`;

      const resourceName = data.chosenName
        ? generateId(data.chosenName as string, {
            randomText: nameRandomSuffix,
            randomLength: 6,
          })
        : data.name;

      createProxyMutation.mutate({
        name: resourceName,
        chosenName: data.chosenName,
        endpoint: fullEndpoint,
        hostnames: data.hostnames,
        tlsHostname: data.tlsHostname,
        trafficProtectionMode: 'Enforce',
        paranoiaLevels: { blocking: 1 },
        enableHttpRedirect: true,
      });
    };

    return (
      <Form.Dialog
        open={open}
        onOpenChange={setOpen}
        title="New AI Edge"
        description="Put your apps, API's, and agents behind a secure, global proxy."
        schema={httpProxySchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        loading={createProxyMutation.isPending}
        submitText="Create"
        submitTextLoading="Creating..."
        className="w-full focus:ring-0 focus:outline-none sm:max-w-2xl">
        <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field name="chosenName" required>
            {({ field, meta }) => {
              const resourceName = field.value
                ? generateId(field.value as string, {
                    randomText: nameRandomSuffix,
                    randomLength: 6,
                  })
                : '';

              return (
                <div className="relative space-y-2">
                  <div className="flex w-full items-center justify-between gap-2">
                    <label htmlFor={field.id} className="text-foreground/80 text-xs font-semibold">
                      Name {meta.required && <span className="text-destructive/80">*</span>}
                    </label>
                  </div>
                  <Form.Input
                    autoFocus
                    placeholder="e.g. Customer API"
                    className="-mb-0.5"
                    data-e2e="create-ai-edge-name-input"
                  />
                  <input type="hidden" name="name" value={resourceName} />
                </div>
              );
            }}
          </Form.Field>

          <Form.Field
            tooltip="Origin is the hostname or IP address where your service is running"
            name="endpointHost"
            label="Origin"
            required>
            <ProtocolEndpointInput onIPChange={setIsIPOrigin} />
          </Form.Field>

          {isIPOrigin && <ProxyTlsField required />}
        </div>
      </Form.Dialog>
    );
  }
);

HttpProxyFormDialog.displayName = 'HttpProxyFormDialog';
