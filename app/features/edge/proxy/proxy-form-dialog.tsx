import { BadgeCopy } from '@/components/badge/badge-copy';
import { ProxyHostnamesField } from '@/features/edge/proxy/form/hostnames-field';
import { ProxyTlsField } from '@/features/edge/proxy/form/tls-field';
import {
  type HttpProxy,
  type HttpProxySchema,
  httpProxySchema,
  useCreateHttpProxy,
  useUpdateHttpProxy,
} from '@/resources/http-proxies';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';
import { toast } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shadcn/ui/collapsible';
import { ChevronDownIcon } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';

export interface HttpProxyFormDialogRef {
  show: (initialValues?: HttpProxy) => void;
  hide: () => void;
}

interface HttpProxyFormDialogProps {
  projectId: string;
  onCreateSuccess?: (proxy: HttpProxy) => void;
  onEditSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const HttpProxyFormDialog = forwardRef<HttpProxyFormDialogRef, HttpProxyFormDialogProps>(
  ({ projectId, onCreateSuccess, onEditSuccess, onError }, ref) => {
    const [open, setOpen] = useState(false);
    const [defaultValues, setDefaultValues] = useState<Partial<HttpProxySchema>>();
    const [editProxyName, setEditProxyName] = useState('');
    const [nameRandomSuffix] = useState(() => generateRandomString(6));

    const isEdit = !!editProxyName;

    const createMutation = useCreateHttpProxy(projectId);
    const updateMutation = useUpdateHttpProxy(projectId, editProxyName);

    const show = useCallback((initialValues?: HttpProxy) => {
      if (initialValues?.uid) {
        setEditProxyName(initialValues.name);
        setDefaultValues({
          name: initialValues.name,
          chosenName: initialValues.chosenName || '',
          endpoint: initialValues.endpoint ?? '',
          hostnames: initialValues.hostnames,
          tlsHostname: initialValues.tlsHostname,
          trafficProtectionMode: initialValues.trafficProtectionMode ?? 'Disabled',
        });
      } else {
        setEditProxyName('');
        setDefaultValues({ trafficProtectionMode: 'Enforce' });
      }
      setOpen(true);
    }, []);

    const hide = useCallback(() => {
      setOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const handleSubmit = async (data: HttpProxySchema) => {
      try {
        if (isEdit) {
          await updateMutation.mutateAsync({
            endpoint: data.endpoint,
            hostnames: data.hostnames,
            tlsHostname: data.tlsHostname,
            chosenName: data.chosenName,
            trafficProtectionMode: data.trafficProtectionMode,
          });
          toast.success('AI Edge', {
            description: 'The Edge endpoint has been updated successfully',
          });
          setOpen(false);
          onEditSuccess?.();
        } else {
          const proxy = await createMutation.mutateAsync(data);
          toast.success('AI Edge', {
            description: 'The Edge endpoint has been created successfully',
          });
          setOpen(false);
          onCreateSuccess?.(proxy);
        }
      } catch (error) {
        toast.error('AI Edge', {
          description:
            (error as Error).message || `Failed to ${isEdit ? 'update' : 'create'} Edge endpoint`,
        });
        onError?.(error as Error);
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

                    {resourceName && (
                      <BadgeCopy
                        value={resourceName}
                        text={resourceName}
                        badgeType="muted"
                        badgeTheme="solid"
                        containerClassName="shrink-0 absolute right-0 -top-2"
                        wrapperTooltipMessage="This is the resource name that will be used to identify your Edge endpoint in the Datum API & CLI"
                      />
                    )}
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
            tooltip="Origin is the URL or hostname where your service is running"
            name="endpoint"
            label="Origin"
            required>
            <Form.Input autoFocus={isEdit} placeholder="e.g. api.example.com" />
          </Form.Field>

          <Form.Field
            name="trafficProtectionMode"
            label="WAF mode"
            description="Choose how the Web Application Firewall (OWASP Core Rule Set) should handle traffic."
            required>
            <Form.Select placeholder="Select WAF mode">
              <Form.SelectItem value="Enforce">Enforce</Form.SelectItem>
              <Form.SelectItem value="Observe">Observe</Form.SelectItem>
              <Form.SelectItem value="Disabled">Disabled</Form.SelectItem>
            </Form.Select>
          </Form.Field>

          {isEdit && (
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="text-foreground hover:text-foreground/80 flex items-center gap-2 text-sm font-medium transition-colors [&[data-state=open]>svg]:rotate-180">
                <ChevronDownIcon className="size-4 shrink-0 transition-transform duration-200" />
                Advanced Config
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-5 pt-5">
                <p className="text-foreground/80 text-sm font-normal">
                  Use our awesome defaults or configure your own here, you can always come back and
                  add or edit these later.
                </p>

                <ProxyHostnamesField projectId={projectId} />
                <ProxyTlsField />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </Form.Dialog>
    );
  }
);

HttpProxyFormDialog.displayName = 'HttpProxyFormDialog';
