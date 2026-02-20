import { ProtocolEndpointInput } from '@/features/edge/proxy/form/protocol-endpoint-input';
import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import { useApp } from '@/providers/app.provider';
import {
  type HttpProxy,
  type HttpProxySchema,
  httpProxySchema,
  createHttpProxyService,
  waitForHttpProxyReady,
  httpProxyKeys,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';
import { useTaskQueue } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { useQueryClient } from '@tanstack/react-query';
import { GaugeIcon } from 'lucide-react';
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

    const { enqueue } = useTaskQueue();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { project, organization } = useApp();
    const { trackAction } = useAnalytics();
    const httpProxyService = createHttpProxyService();

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

    const handleSubmit = async (data: HttpProxySchema) => {
      const protocol = data.protocol || 'https';
      const fullEndpoint = `${protocol}://${data.endpointHost}`;

      setOpen(false);

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
              trafficProtectionMode: 'Enforce',
              paranoiaLevels: { blocking: 1 },
              enableHttpRedirect: true,
            });

            const proxyName =
              typeof createdProxy === 'object' && createdProxy !== null && 'name' in createdProxy
                ? (createdProxy as HttpProxy).name
                : resourceName;

            navigate(
              getPathWithParams(paths.project.detail.proxy.detail.root, {
                projectId,
                proxyId: proxyName,
              })
            );

            const { promise, cancel } = waitForHttpProxyReady(projectId, resourceName);
            ctx.onCancel(cancel);

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
          if (outcome.status === 'completed') {
            trackAction(AnalyticsAction.AddProxy);
          } else if (outcome.status === 'failed') {
            const errorMessage =
              outcome.failedItems[0]?.message || 'Failed to create Edge endpoint';
            onError?.(new Error(errorMessage));
          }
        },
      });
    };

    return (
      <Form.Dialog
        key={open ? 'open-create' : 'closed'}
        open={open}
        onOpenChange={setOpen}
        title="New AI Edge"
        description="Put your apps, API's, and agents behind a secure, global proxy."
        schema={httpProxySchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
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
                  <Form.Input autoFocus placeholder="e.g. Customer API" className="-mb-0.5" />
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
            <ProtocolEndpointInput />
          </Form.Field>
        </div>
      </Form.Dialog>
    );
  }
);

HttpProxyFormDialog.displayName = 'HttpProxyFormDialog';
