import {
  formatShare,
  poolWith,
  suggestedWeight as suggestWeight,
  toBackendRows,
  type BackendRow,
} from './backend-pool';
import { ProtocolEndpointInput } from '@/features/edge/proxy/form/protocol-endpoint-input';
import { workloadNameFromNetworkService } from '@/features/edge/proxy/overview/compute-backend';
import { showMutationErrorToast } from '@/modules/quota';
import {
  HTTP_PROXY_MAX_WEIGHT,
  type HttpProxy,
  type HttpProxyBackendInput,
  useUpdateHttpProxy,
} from '@/resources/http-proxies';
import { useNetworkServices } from '@/resources/network-services';
import { isIPAddress } from '@/utils/helpers/validation.helper';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@datum-cloud/datum-ui/collapsible';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { RadioGroup, RadioGroupItem } from '@datum-cloud/datum-ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { BoxesIcon, ChevronRightIcon, GlobeIcon } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { z } from 'zod';

type OriginType = 'endpoint' | 'networkService';

/**
 * Split an endpoint into the protocol select and the free-text field. Unlike
 * parseEndpoint this keeps any path, which backend endpoints may carry.
 */
function splitEndpoint(endpoint: string | undefined): {
  protocol: 'http' | 'https';
  endpointHost: string;
} {
  if (!endpoint) return { protocol: 'https', endpointHost: '' };
  const protocol = endpoint.startsWith('http://') ? 'http' : 'https';
  return { protocol, endpointHost: endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '') };
}

function hostOf(endpointHost: string | undefined): string {
  return endpointHost?.split(/[:/]/)[0] ?? '';
}

const optionalNumber = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
  z.number().optional()
);

/**
 * Fields for the origin type not on screen unmount, and a disabled weight
 * isn't submitted, so everything is optional and checked against the choices
 * actually made.
 */
function backendSchema(otherWeight: number, originLocked: boolean) {
  return z
    .object({
      originType: z.enum(['endpoint', 'networkService']).default('endpoint'),
      protocol: z.enum(['http', 'https']).default('https'),
      endpointHost: z.string().trim().optional(),
      serviceName: z.string().optional(),
      servicePort: z.string().optional(),
      // Allow empty string so clearing TLS validates and can be sent as an explicit clear.
      tlsHostname: z.string().max(253).optional(),
      weight: optionalNumber,
    })
    .superRefine((data, ctx) => {
      if (!originLocked && data.originType === 'endpoint') {
        if (!data.endpointHost) {
          ctx.addIssue({ code: 'custom', message: 'Address is required', path: ['endpointHost'] });
        } else if (/\s/.test(data.endpointHost) || /^[a-z]+:\/\//i.test(data.endpointHost)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Enter a hostname or IP with an optional port, without the scheme',
            path: ['endpointHost'],
          });
        }
        if (
          data.protocol === 'https' &&
          isIPAddress(hostOf(data.endpointHost)) &&
          !data.tlsHostname?.trim()
        ) {
          ctx.addIssue({
            code: 'custom',
            message: 'TLS hostname is required for IP-based HTTPS origins',
            path: ['tlsHostname'],
          });
        }
      }
      if (!originLocked && data.originType === 'networkService') {
        if (!data.serviceName) {
          ctx.addIssue({ code: 'custom', message: 'Choose a service', path: ['serviceName'] });
        } else if (!data.servicePort) {
          ctx.addIssue({ code: 'custom', message: 'Choose a port', path: ['servicePort'] });
        }
      }
      const weight = data.weight;
      if (weight === undefined || !Number.isInteger(weight) || weight < 0) {
        ctx.addIssue({ code: 'custom', message: 'Enter a whole number', path: ['weight'] });
      } else if (weight > HTTP_PROXY_MAX_WEIGHT) {
        ctx.addIssue({
          code: 'custom',
          message: `Weight must be ${HTTP_PROXY_MAX_WEIGHT.toLocaleString()} or less`,
          path: ['weight'],
        });
      } else if (otherWeight + weight === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Every other backend is drained, so this one needs a weight above 0',
          path: ['weight'],
        });
      }
    });
}

type BackendFormValues = z.infer<ReturnType<typeof backendSchema>>;

export interface BackendFormDialogRef {
  /** Open empty to add, or with a row to edit it. */
  show: (row?: BackendRow) => void;
}

const ORIGIN_TYPES: Array<{
  value: OriginType;
  label: string;
  hint: string;
  icon: typeof GlobeIcon;
}> = [
  {
    value: 'endpoint',
    label: 'Public internet',
    hint: 'Any HTTP or HTTPS origin',
    icon: GlobeIcon,
  },
  {
    value: 'networkService',
    label: 'Datum compute',
    hint: 'A workload’s service',
    icon: BoxesIcon,
  },
];

/** Origin type as radio cards: an obvious form choice with a fixed height. */
function OriginTypeCards({
  value,
  onChange,
}: {
  value: OriginType;
  onChange: (value: OriginType) => void;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as OriginType)}
      className="grid grid-cols-2 gap-3">
      {ORIGIN_TYPES.map((option) => (
        <label
          key={option.value}
          htmlFor={`origin-type-${option.value}`}
          className="has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/3 hover:bg-muted/40 flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors">
          <RadioGroupItem
            id={`origin-type-${option.value}`}
            value={option.value}
            className="mt-0.5 shrink-0"
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-1.5">
              <Icon icon={option.icon} size={14} className="text-muted-foreground shrink-0" />
              <Text as="span" size="sm" weight="medium">
                {option.label}
              </Text>
            </span>
            <Text as="span" size="xs" textColor="muted">
              {option.hint}
            </Text>
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}

/**
 * TLS settings for an endpoint origin. Reads the address as typed, so it lives
 * inside the form. The content stays mounted while collapsed: an unmounted
 * field drops out of the submitted values, which would clear a saved TLS
 * hostname just because the section was closed.
 */
function AdvancedSettings({
  open,
  onOpenChange,
  disabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kept on screen for compute backends, which take no TLS settings, so nothing shifts. */
  disabled?: boolean;
}) {
  const endpointHost = Form.useWatch<string>('endpointHost') ?? '';
  const protocol = Form.useWatch<string>('protocol') ?? 'https';
  const host = hostOf(endpointHost);
  const tlsRequired = protocol === 'https' && isIPAddress(host);

  return (
    <Collapsible open={open && !disabled} onOpenChange={onOpenChange} disabled={disabled}>
      <div className="rounded-lg border">
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-60 [&[data-state=open]>svg]:rotate-90">
          <Icon
            icon={ChevronRightIcon}
            size={14}
            className="text-muted-foreground shrink-0 transition-transform duration-200"
          />
          <Text as="span" size="sm" weight="medium">
            Advanced settings
          </Text>
          <Text as="span" size="xs" textColor="muted" className="hidden sm:inline">
            TLS
          </Text>
          <Text
            as="span"
            size="xs"
            textColor={tlsRequired && !disabled ? 'warning' : 'muted'}
            className="ml-auto">
            {disabled
              ? 'Not used for Datum compute'
              : tlsRequired
                ? 'TLS hostname required'
                : 'Optional'}
          </Text>
        </CollapsibleTrigger>
        <CollapsibleContent forceMount className="border-t px-3 py-4 data-[state=closed]:hidden">
          <Form.Field
            name="tlsHostname"
            label="TLS hostname"
            required={tlsRequired}
            description="Sent as SNI and used to check the origin’s certificate. Leave empty to use the hostname from the address.">
            <Form.Input
              placeholder={tlsRequired ? 'e.g. secure.example.com' : host || 'e.g. api.example.com'}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </Form.Field>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/**
 * Weight with a live share preview. 0 is how a backend is drained, so there's
 * no separate state control. A plain number input: datum-ui's InputNumber
 * needs the optional react-number-format peer, which the portal doesn't install.
 */
function WeightField({ otherWeight }: { otherWeight: number }) {
  const raw = Form.useWatch<string | number>('weight');
  const weight = raw === '' || raw === undefined ? undefined : Number(raw);
  const valid = weight !== undefined && Number.isFinite(weight) && weight >= 0;
  const share = valid && otherWeight + weight > 0 ? (weight / (otherWeight + weight)) * 100 : 0;

  return (
    <Form.Field
      name="weight"
      label="Weight"
      required
      description="Traffic is split across the pool in proportion to each backend’s weight. Set 0 to drain it: it stays in the pool but receives no traffic.">
      <div className="flex items-center gap-3">
        <Form.Input
          type="number"
          min={0}
          max={HTTP_PROXY_MAX_WEIGHT}
          step={1}
          inputMode="numeric"
          className="max-w-32"
        />
        <Text
          size="xs"
          textColor={valid && weight === 0 ? 'warning' : 'muted'}
          className="tabular-nums">
          {!valid
            ? '\u00a0'
            : weight === 0
              ? 'Drained · receives no traffic'
              : `≈ ${formatShare(share)} of traffic`}
        </Text>
      </div>
    </Form.Field>
  );
}

export const BackendFormDialog = forwardRef<
  BackendFormDialogRef,
  { projectId: string; proxy: HttpProxy }
>(({ projectId, proxy }, ref) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BackendRow>();
  const [defaultValues, setDefaultValues] = useState<Partial<BackendFormValues>>();
  // Mirrors of form values that decide which fields are on screen.
  const [originType, setOriginType] = useState<OriginType>('endpoint');
  const [serviceName, setServiceName] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const updateMutation = useUpdateHttpProxy(projectId, proxy.name);
  const { data: services = [], isLoading: servicesLoading } = useNetworkServices(projectId, {
    enabled: open,
  });

  // Connector and VPC instance backends can't be recreated from this form, so
  // only their traffic settings are editable.
  const originLocked =
    !!editing && editing.backend.kind !== 'endpoint' && editing.backend.kind !== 'networkService';
  const otherWeight = useMemo(
    () =>
      toBackendRows(proxy.backends)
        .filter((row) => row.index !== editing?.index)
        .reduce((sum, row) => sum + row.weight, 0),
    [proxy.backends, editing?.index]
  );
  const schema = useMemo(
    () => backendSchema(otherWeight, originLocked),
    [otherWeight, originLocked]
  );

  const selectedService = services.find((service) => service.metadata?.name === serviceName);

  const suggestedWeight = useMemo(() => suggestWeight(proxy.backends), [proxy.backends]);

  const show = useCallback(
    (row?: BackendRow) => {
      const backend = row?.backend;
      const { protocol: scheme, endpointHost: host } = splitEndpoint(backend?.endpoint);
      const type: OriginType = backend?.kind === 'networkService' ? 'networkService' : 'endpoint';
      const initialWeight = row ? row.weight : suggestedWeight;

      setEditing(row);
      setOriginType(type);
      setServiceName(backend?.networkService?.name ?? '');
      setAdvancedOpen(!!backend?.tlsHostname);
      setDefaultValues({
        originType: type,
        protocol: scheme,
        endpointHost: host,
        serviceName: backend?.networkService?.name ?? '',
        servicePort: backend?.networkService?.port ?? '',
        tlsHostname: backend?.tlsHostname ?? '',
        weight: initialWeight,
      });
      setOpen(true);
    },
    [suggestedWeight]
  );

  useImperativeHandle(ref, () => ({ show }), [show]);

  const handleSubmit = async (data: BackendFormValues) => {
    const nextWeight = data.weight ?? suggestedWeight;
    // Only carry the original entry through when the kind is unchanged, so a
    // switched backend doesn't keep the other kind's target alongside the new one.
    const keepRaw = (kind: string) =>
      editing && editing.backend.kind === kind ? editing.backend.raw : undefined;

    let backend: HttpProxyBackendInput;
    if (originLocked) {
      backend = { raw: editing!.backend.raw, weight: nextWeight };
    } else if (data.originType === 'networkService') {
      const { tls: _tls, endpoint: _endpoint, ...raw } = keepRaw('networkService') ?? {};
      backend = {
        raw: { ...raw, networkService: { name: data.serviceName, port: data.servicePort } },
        weight: nextWeight,
      };
    } else {
      backend = {
        endpoint: `${data.protocol}://${data.endpointHost}`,
        tlsHostname: (data.tlsHostname ?? '').trim(),
        weight: nextWeight,
        raw: keepRaw('endpoint'),
      };
    }

    try {
      await updateMutation.mutateAsync({
        backends: poolWith(
          proxy.backends,
          editing ? { type: 'replace', index: editing.index, backend } : { type: 'add', backend }
        ),
      });
      toast.success('Application Load Balancer', {
        description: editing ? 'Backend updated' : 'Backend added to the pool',
      });
      setOpen(false);
    } catch (error) {
      showMutationErrorToast(error, {
        fallbackTitle: 'Application Load Balancer',
        fallbackDescription:
          (error as Error).message ||
          (editing ? 'Failed to update backend' : 'Failed to add backend'),
        scope: 'project',
        projectId,
      });
    }
  };

  return (
    <Form.Dialog
      open={open}
      onOpenChange={setOpen}
      title={editing ? 'Edit backend' : 'Add backend'}
      description={
        editing
          ? 'Change where this backend points and how much traffic it receives.'
          : 'Add a target to this load balancer’s pool.'
      }
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      submitText={editing ? 'Save' : 'Add backend'}
      submitTextLoading={editing ? 'Saving...' : 'Adding...'}
      className="w-full focus:ring-0 focus:outline-none sm:max-w-xl">
      {/* Same divided, padded sections as the other ALB dialogs. */}
      <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        <div className="flex flex-col gap-5">
          {originLocked && editing ? (
            <div className="bg-muted/40 flex flex-col gap-1 rounded-lg border px-3 py-2.5">
              <Text size="xs" weight="medium">
                {editing.kindLabel ?? 'Backend'}
              </Text>
              <Text size="xs" textColor="muted" className="font-mono break-all">
                {editing.title} · {editing.address}
              </Text>
            </div>
          ) : (
            <>
              <Form.Field name="originType" label="Origin type">
                {({ control }) => (
                  <OriginTypeCards
                    value={originType}
                    onChange={(next) => {
                      control.change(next);
                      setOriginType(next);
                    }}
                  />
                )}
              </Form.Field>

              {originType === 'endpoint' ? (
                <Form.Field
                  name="endpointHost"
                  label="Address"
                  required
                  tooltip="The hostname or IP where your service runs. Each origin receives requests addressed to its own hostname.">
                  <ProtocolEndpointInput
                    autoFocus={!editing}
                    onIPChange={(isIp) => {
                      // Required for an HTTPS IP origin, so make sure it's visible.
                      if (isIp) setAdvancedOpen(true);
                    }}
                  />
                </Form.Field>
              ) : (
                // One row at every width, the same height as the address field.
                <div className="grid grid-cols-[1fr_7rem] gap-3 sm:grid-cols-[1fr_10rem]">
                  <Form.Field name="serviceName" label="Service" required>
                    {({ control }) => (
                      // One wrapper: Select renders a hidden native <select> after its
                      // trigger, and Form.Field's space-y-2 would give the trigger a
                      // bottom margin, making this row taller than the address field.
                      <div className="relative">
                        <Select
                          value={(control.value as string) || undefined}
                          onValueChange={(next) => {
                            control.change(next);
                            setServiceName(next);
                          }}
                          disabled={servicesLoading || services.length === 0}>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                servicesLoading
                                  ? 'Loading services…'
                                  : services.length === 0
                                    ? 'No compute services in this project'
                                    : 'Choose a service'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map((service) => {
                              const name = service.metadata?.name ?? '';
                              const workload = workloadNameFromNetworkService(service);
                              return (
                                <SelectItem key={name} value={name}>
                                  {workload && workload !== name ? `${workload} · ${name}` : name}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </Form.Field>
                  <Form.Field name="servicePort" label="Port" required>
                    {({ control }) => (
                      <div className="relative">
                        <Select
                          // Remount on service change so a stale port never lingers.
                          key={serviceName}
                          value={(control.value as string) || undefined}
                          onValueChange={control.change}
                          disabled={!selectedService}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Port" />
                          </SelectTrigger>
                          <SelectContent>
                            {(selectedService?.spec.ports ?? []).map((port) => (
                              <SelectItem key={port.name} value={port.name}>
                                {port.name} · {port.port}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </Form.Field>
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <WeightField otherWeight={otherWeight} />
        </div>

        {!originLocked ? (
          <div>
            <AdvancedSettings
              open={advancedOpen}
              onOpenChange={setAdvancedOpen}
              disabled={originType === 'networkService'}
            />
          </div>
        ) : null}
      </div>
    </Form.Dialog>
  );
});

BackendFormDialog.displayName = 'BackendFormDialog';
