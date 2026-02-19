import { ProxyHostnamesField } from '@/features/edge/proxy/form/hostnames-field';
import { ProtocolEndpointInput } from '@/features/edge/proxy/form/protocol-endpoint-input';
import { ProxyTlsField } from '@/features/edge/proxy/form/tls-field';
import { useApp } from '@/providers/app.provider';
import {
  type HttpProxy,
  type HttpProxySchema,
  httpProxySchema,
  useUpdateHttpProxy,
  createHttpProxyService,
  waitForHttpProxyReady,
  httpProxyKeys,
  getWafModeWithParanoia,
  parseWafModeWithParanoia,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';
import { useInputControl } from '@conform-to/react';
import { toast, useTaskQueue } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shadcn/ui/collapsible';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDownIcon, GaugeIcon } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { useNavigate } from 'react-router';

// Component that conditionally disables HTTP redirect option based on protocol
const ConditionalHttpRedirectField = () => {
  const { fields } = Form.useFormContext();
  const protocolField = fields.protocol as any;
  const protocolControl = useInputControl(protocolField);
  const protocolValue =
    (Array.isArray(protocolControl.value) ? protocolControl.value[0] : protocolControl.value) ||
    'https';
  const isHttpProtocol = protocolValue === 'http';

  return (
    <Form.Field
      label="Force HTTPS"
      name="enableHttpRedirect"
      tooltip={
        isHttpProtocol
          ? 'Force all HTTP requests to be redirected to HTTPS using a 301 permanent redirect'
          : 'Force HTTPS is only available when the origin protocol is HTTP'
      }>
      <Form.Switch label="Enable Force HTTPS" disabled={!isHttpProtocol} />
    </Form.Field>
  );
};

export interface HttpProxyFormDialogRef {
  show: (initialValues?: HttpProxy) => void;
  hide: () => void;
}

interface HttpProxyFormDialogProps {
  projectId: string;
  onEditSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const HttpProxyFormDialog = forwardRef<HttpProxyFormDialogRef, HttpProxyFormDialogProps>(
  ({ projectId, onEditSuccess, onError }, ref) => {
    const [open, setOpen] = useState(false);
    const [defaultValues, setDefaultValues] = useState<Partial<HttpProxySchema>>();
    const [editProxyName, setEditProxyName] = useState('');
    const [nameRandomSuffix] = useState(() => generateRandomString(6));

    const isEdit = !!editProxyName;

    const { enqueue } = useTaskQueue();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { project, organization } = useApp();
    const updateMutation = useUpdateHttpProxy(projectId, editProxyName);
    const httpProxyService = createHttpProxyService();

    const show = useCallback((initialValues?: HttpProxy) => {
      if (initialValues?.uid) {
        setEditProxyName(initialValues.name);

        // Parse existing endpoint to extract protocol and hostname:port
        let protocol: 'http' | 'https' = 'https';
        let endpointHost = '';

        if (initialValues.endpoint) {
          try {
            const url = new URL(initialValues.endpoint);
            protocol = url.protocol === 'http:' ? 'http' : 'https';
            endpointHost = url.port ? `${url.hostname}:${url.port}` : url.hostname;
          } catch {
            // If parsing fails, try to extract protocol manually
            if (initialValues.endpoint.startsWith('http://')) {
              protocol = 'http';
              endpointHost = initialValues.endpoint.replace(/^https?:\/\//, '');
            } else if (initialValues.endpoint.startsWith('https://')) {
              protocol = 'https';
              endpointHost = initialValues.endpoint.replace(/^https?:\/\//, '');
            } else {
              endpointHost = initialValues.endpoint;
            }
          }
        }

        const wafModeWithParanoia = getWafModeWithParanoia(
          initialValues.trafficProtectionMode,
          initialValues.paranoiaLevels?.blocking
        );

        setDefaultValues({
          name: initialValues.name,
          chosenName: initialValues.chosenName || '',
          protocol,
          endpointHost,
          hostnames: initialValues.hostnames,
          tlsHostname: initialValues.tlsHostname,
          trafficProtectionMode: initialValues.trafficProtectionMode ?? 'Disabled',
          wafModeWithParanoia,
          enableHttpRedirect: initialValues.enableHttpRedirect ?? false,
        });
      } else {
        setEditProxyName('');
        setDefaultValues({
          protocol: 'https',
          trafficProtectionMode: 'Enforce',
          wafModeWithParanoia: 'Enforce (Basic)',
        });
      }
      setOpen(true);
    }, []);

    const hide = useCallback(() => {
      setOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const handleSubmit = async (data: HttpProxySchema) => {
      // Ensure protocol has a value (default to 'https' if not set)
      const protocol = data.protocol || 'https';
      // Combine protocol and endpointHost into full endpoint URL
      const fullEndpoint = `${protocol}://${data.endpointHost}`;

      // Parse the combined WAF mode + paranoia level
      const wafConfig = data.wafModeWithParanoia
        ? parseWafModeWithParanoia(data.wafModeWithParanoia)
        : { mode: data.trafficProtectionMode ?? 'Enforce', blocking: undefined };

      if (isEdit) {
        // Updates don't need async waiting - they're synchronous
        try {
          await updateMutation.mutateAsync({
            endpoint: fullEndpoint,
            hostnames: data.hostnames,
            tlsHostname: data.tlsHostname,
            chosenName: data.chosenName,
            trafficProtectionMode: wafConfig.mode,
            paranoiaLevels:
              wafConfig.blocking !== undefined ? { blocking: wafConfig.blocking } : undefined,
            enableHttpRedirect: data.enableHttpRedirect ?? false,
          });
          toast.success('AI Edge', {
            description: 'The Edge endpoint has been updated successfully',
          });
          setOpen(false);
          onEditSuccess?.();
        } catch (error) {
          toast.error('AI Edge', {
            description: (error as Error).message || 'Failed to update Edge endpoint',
          });
          onError?.(error as Error);
        }
      } else {
        // Close dialog immediately - task queue will handle the rest
        setOpen(false);

        // Generate the resource name
        const resourceName = data.chosenName
          ? generateId(data.chosenName as string, {
              randomText: nameRandomSuffix,
              randomLength: 6,
            })
          : data.name;

        const metadata =
          project && organization
            ? {
                scope: 'edge',
                projectId: project.name,
                projectName: project.displayName || project.name,
                orgId: organization.name,
                orgName: organization.displayName || organization.name,
              }
            : undefined;

        enqueue({
          title: `Creating AI Edge "${data.chosenName || resourceName}"`,
          icon: <GaugeIcon className="size-4" />,
          cancelable: false,
          metadata,
          processor: async (ctx) => {
            try {
              const createdProxy = await httpProxyService.create(projectId, {
                name: resourceName,
                chosenName: data.chosenName,
                endpoint: fullEndpoint,
                hostnames: data.hostnames,
                tlsHostname: data.tlsHostname,
                trafficProtectionMode: wafConfig.mode,
                paranoiaLevels:
                  wafConfig.blocking !== undefined ? { blocking: wafConfig.blocking } : undefined,
                enableHttpRedirect: data.enableHttpRedirect ?? false,
              });

              // Navigate immediately once we have the proxy name
              const proxyName =
                typeof createdProxy === 'object' && createdProxy !== null && 'name' in createdProxy
                  ? (createdProxy as HttpProxy).name
                  : resourceName;

              navigate(
                getPathWithParams(paths.project.detail.proxy.detail.overview, {
                  projectId,
                  proxyId: proxyName,
                })
              );

              const { promise, cancel } = waitForHttpProxyReady(projectId, resourceName);
              ctx.onCancel(cancel); // Register cleanup - called automatically on cancel/timeout

              const readyProxy = await promise;

              ctx.setResult(readyProxy);
              ctx.succeed();
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              ctx.fail(undefined, errorMessage);
            }
          },
          onComplete: (outcome) => {
            queryClient.invalidateQueries({ queryKey: httpProxyKeys.list(projectId) });
            if (outcome.status === 'failed') {
              const errorMessage = outcome.failedItems[0]?.message || 'Failed to create AI Edge';
              onError?.(new Error(errorMessage));
            }
          },
        });
      }
    };

    return (
      <Form.Dialog
        key={open ? `open-${editProxyName || 'create'}` : 'closed'}
        open={open}
        onOpenChange={setOpen}
        title={isEdit ? 'Edit AI Edge' : 'New AI Edge'}
        description={`${isEdit ? 'Edit your AI Edge endpoint' : `Put your apps, API's, and agents behind a secure, global proxy.`} `}
        schema={httpProxySchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitText={isEdit ? 'Save' : 'Create'}
        submitTextLoading={isEdit ? 'Saving...' : 'Creating...'}
        className="w-full focus:ring-0 focus:outline-none sm:max-w-2xl">
        <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field name="chosenName" required>
            {({ field, meta }) => {
              const resourceName =
                isEdit && editProxyName
                  ? editProxyName
                  : field.value
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
                    autoFocus={!isEdit}
                    placeholder="e.g. Customer API"
                    className="-mb-0.5"
                  />
                  {/* Hidden input to satisfy schema and submit the generated resource name */}
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
            <ProtocolEndpointInput autoFocus={isEdit} />
          </Form.Field>

          <Form.Field
            name="wafModeWithParanoia"
            label="WAF mode"
            tooltip="Choose how the Web Application Firewall (OWASP Core Rule Set) should handle traffic and it's paranoia level. You can change the protection mode after your edge is created."
            required>
            {({ field }) => {
              // Sync trafficProtectionMode when wafModeWithParanoia changes
              const wafConfig = field.value
                ? parseWafModeWithParanoia(
                    field.value as
                      | 'Observe'
                      | 'Enforce (Basic)'
                      | 'Enforce (Medium)'
                      | 'Enforce (High)'
                      | 'Disabled'
                  )
                : { mode: 'Enforce' as const };

              return (
                <>
                  <Form.RadioGroup orientation="vertical">
                    <Form.RadioItem value="Observe" label="Observe" />
                    <Form.RadioItem value="Enforce (Basic)" label="Enforce (Basic)" />
                    <Form.RadioItem value="Enforce (Medium)" label="Enforce (Medium)" />
                    <Form.RadioItem value="Enforce (High)" label="Enforce (High)" />
                    <Form.RadioItem value="Disabled" label="Disabled" />
                  </Form.RadioGroup>
                  {/* Hidden field to satisfy schema requirement */}
                  <input type="hidden" name="trafficProtectionMode" value={wafConfig.mode} />
                </>
              );
            }}
          </Form.Field>

          {isEdit && (
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="text-foreground hover:text-foreground/80 flex items-center gap-2 text-sm font-medium transition-colors [&[data-state=open]>svg]:rotate-180">
                <ChevronDownIcon className="size-4 shrink-0 transition-transform duration-200" />
                Advanced Config
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-5 pt-5">
                <ProxyHostnamesField projectId={projectId} />
                <ProxyTlsField />
                <ConditionalHttpRedirectField />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </Form.Dialog>
    );
  }
);

HttpProxyFormDialog.displayName = 'HttpProxyFormDialog';
