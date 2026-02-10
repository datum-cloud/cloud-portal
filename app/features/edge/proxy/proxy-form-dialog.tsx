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
import type { TrafficProtectionMode } from '@/resources/http-proxies/http-proxy.schema';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';
import { toast } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { cn } from '@shadcn/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shadcn/ui/collapsible';
import { ChevronDownIcon, Eye, ShieldCheck, ShieldOff } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';

const WAF_MODE_OPTIONS: Array<{
  value: TrafficProtectionMode;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: 'Enforce',
    title: 'Enforce',
    description:
      "Block requests that match OWASP rules. Best for production when you're ready to protect your service.",
    icon: ShieldCheck,
  },
  {
    value: 'Observe',
    title: 'Observe',
    description:
      'Log rule matches without blocking. Use this to tune rules and reduce false positives before enforcing.',
    icon: Eye,
  },
  {
    value: 'Disabled',
    title: 'Disabled',
    description: 'WAF is off. No inspection or blocking; traffic passes through unchanged.',
    icon: ShieldOff,
  },
];

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
        title={isEdit ? 'Edit Edge endpoint' : 'Create a new Edge endpoint'}
        description={`${isEdit ? 'Edit' : 'Create'} an Edge endpoint to expose your service via Datum AI Edge — with automatic HTTPS, smart routing, intelligent WAF and zero hassle. Just tell us your origin, and we'll handle the rest.`}
        schema={httpProxySchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitText={isEdit ? 'Save' : 'Create'}
        submitTextLoading={isEdit ? 'Saving...' : 'Creating...'}
        className="w-full focus:ring-0 focus:outline-none sm:max-w-2xl">
        <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field
            name="chosenName"
            description="A human-friendly name for this Edge endpoint. This is what you'll see in Datum applications."
            required>
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
            name="endpoint"
            label="Origin"
            description="Enter the URL or hostname where your service is running"
            required>
            <Form.Input
              autoFocus={isEdit}
              placeholder="e.g. https://api.example.com"
              defaultValue={isEdit ? defaultValues?.endpoint : 'https://'}
            />
          </Form.Field>

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

              <Form.Field
                name="trafficProtectionMode"
                label="WAF mode"
                description="Choose how the Web Application Firewall (OWASP Core Rule Set) should handle traffic."
                required>
                {({ field, control }) => {
                  const value = (control.value as TrafficProtectionMode) || 'Enforce';
                  return (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {WAF_MODE_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const isSelected = value === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              aria-label={option.title}
                              onClick={() => control.change(option.value)}
                              className={cn(
                                'relative flex flex-col items-start rounded-lg border p-4 text-left transition-colors',
                                'hover:border-border/80 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                                isSelected
                                  ? 'border-primary bg-primary/5 ring-primary ring-2'
                                  : 'border-border bg-card'
                              )}>
                              <span
                                className={cn(
                                  'absolute top-3 right-3 size-4 rounded-full border-2',
                                  isSelected
                                    ? 'border-primary bg-primary'
                                    : 'border-muted-foreground/40'
                                )}
                                aria-hidden
                              />
                              <div className="bg-muted/80 mb-3 flex size-9 shrink-0 items-center justify-center rounded-xl">
                                <Icon className="text-muted-foreground size-4" />
                              </div>
                              <span className="text-foreground mb-1 text-sm font-semibold">
                                {option.title}
                              </span>
                              <p className="text-muted-foreground text-xs leading-relaxed">
                                {option.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                      <input type="hidden" name={field.name} value={value} readOnly aria-hidden />
                    </>
                  );
                }}
              </Form.Field>
              <ProxyHostnamesField projectId={projectId} />
              <ProxyTlsField />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </Form.Dialog>
    );
  }
);

HttpProxyFormDialog.displayName = 'HttpProxyFormDialog';
