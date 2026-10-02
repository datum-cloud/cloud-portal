import { ProtocolEndpointInput } from '@/features/edge/proxy/form/protocol-endpoint-input';
import { backendTrafficShares } from '@/features/edge/proxy/overview/backend-summary';
import { workloadNameFromNetworkService } from '@/features/edge/proxy/overview/compute-backend';
import {
  type BackendsFormValues,
  LOAD_BALANCER_OPTIONS,
  MAX_BACKEND_WEIGHT,
  backendHost,
  backendsFormSchema,
  emptyBackendRow,
  toBackendsFormValues,
  toBackendsUpdateInput,
} from '@/features/edge/proxy/proxy-backends-form';
import type { ComDatumapisNetworkingV1AlphaNetworkService } from '@/modules/control-plane/networking';
import { showMutationErrorToast } from '@/modules/quota';
import { type HttpProxy, useUpdateHttpProxy } from '@/resources/http-proxies';
import { useNetworkServices } from '@/resources/network-services';
import { isIPAddress } from '@/utils/helpers/validation.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@datum-cloud/datum-ui/dropdown';
import { Form, useWatch } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  ChevronDownIcon,
  EllipsisIcon,
  GlobeIcon,
  LockIcon,
  NetworkIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

export interface ProxyBackendsDialogRef {
  show: (proxy: HttpProxy) => void;
  hide: () => void;
}

interface ProxyBackendsDialogProps {
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

type WatchedRow = {
  kind?: string;
  protocol?: string;
  endpointHost?: string;
  serviceName?: string;
  servicePort?: string;
  weight?: string | number;
  tlsHostname?: string;
};

type NetworkService = ComDatumapisNetworkingV1AlphaNetworkService;

// One grid for the header and every row so the columns line up:
// kind, target, weight, share, row menu.
const ROW_GRID_SEVERAL = 'grid grid-cols-[6.5rem_minmax(0,1fr)_4.5rem_2.75rem_2rem] gap-2';
const ROW_GRID_SINGLE = 'grid grid-cols-[6.5rem_minmax(0,1fr)_2rem] gap-2';

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Text size="xs" weight="semibold">
        {title}
      </Text>
      <Text size="xs" textColor="muted">
        {description}
      </Text>
    </div>
  );
}

function ColumnLabel({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <Text size="5xs" weight="medium" textColor="muted" className={cn('uppercase', className)}>
      {children}
    </Text>
  );
}

/** Members, health, and locations for a NetworkService, as one muted line. */
function describeService(service: NetworkService | undefined): string | undefined {
  if (!service) return undefined;
  const parts: string[] = [];
  const workload = workloadNameFromNetworkService(service);
  if (workload) parts.push(`Workload ${workload}`);
  const summary = service.status?.summary;
  if (summary?.members !== undefined) {
    parts.push(`${summary.healthy ?? 0}/${summary.members} healthy`);
  }
  if (summary?.locations) {
    parts.push(`${summary.locations} location${summary.locations === 1 ? '' : 's'}`);
  }
  return parts.join(' · ') || undefined;
}

function ServiceTarget({ index, services }: { index: number; services: NetworkService[] }) {
  const row = useWatch(`backends.${index}`) as WatchedRow | undefined;
  const { control: portControl } = Form.useField(`backends.${index}.servicePort`);
  const selected = services.find((service) => service.metadata?.name === row?.serviceName);
  const ports = selected?.spec?.ports ?? [];
  // Keep a reference to a service that no longer exists selectable, so opening
  // and saving the dialog doesn't silently drop it.
  const names = services.map((service) => service.metadata?.name ?? '').filter(Boolean);
  if (row?.serviceName && !names.includes(row.serviceName)) names.unshift(row.serviceName);

  // One port: pick it. A port the service no longer declares: clear it.
  const portNames = ports.map((port) => port.name).join(',');
  useEffect(() => {
    if (!selected) return;
    const current = row?.servicePort ?? '';
    const declared = ports.some((port) => port.name === current);
    if (ports.length === 1 && current !== ports[0].name) portControl.change(ports[0].name);
    else if (current && !declared && ports.length !== 1) portControl.change('');
    // Keyed on the service and its port names; portControl is stable per field.
  }, [selected?.metadata?.name, portNames]);

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_7rem] gap-2">
      <Form.Field name={`backends.${index}.serviceName`}>
        <Form.Select placeholder="Choose a service">
          {names.map((name) => (
            <Form.SelectItem key={name} value={name}>
              {name}
            </Form.SelectItem>
          ))}
        </Form.Select>
      </Form.Field>
      <Form.Field name={`backends.${index}.servicePort`}>
        <Form.Select placeholder="Port" disabled={!selected || ports.length === 0}>
          {ports.map((port) => (
            <Form.SelectItem key={port.name} value={port.name}>
              {port.name} · {port.port}
            </Form.SelectItem>
          ))}
        </Form.Select>
      </Form.Field>
    </div>
  );
}

function BackendRow({
  index,
  several,
  share,
  services,
  onRemove,
}: {
  index: number;
  several: boolean;
  share: number | undefined;
  services: NetworkService[];
  onRemove?: () => void;
}) {
  const row = useWatch(`backends.${index}`) as WatchedRow | undefined;
  const isService = row?.kind === 'service';
  const isIp = !isService && isIPAddress(backendHost(row?.endpointHost ?? ''));
  const https = (row?.protocol ?? 'https') === 'https';
  // FormData only carries rendered inputs, so a TLS hostname that is set must
  // stay on screen or a save would clear it. Once shown, it stays shown.
  const [tlsOpen, setTlsOpen] = useState(() => !!row?.tlsHostname);
  useEffect(() => {
    if (row?.tlsHostname) setTlsOpen(true);
  }, [row?.tlsHostname]);
  const showTls = !isService && (isIp || tlsOpen);
  const serviceLine = isService
    ? describeService(services.find((service) => service.metadata?.name === row?.serviceName))
    : undefined;
  const menuItems = [
    !isService && !showTls
      ? { label: 'Set TLS hostname', icon: LockIcon, onClick: () => setTlsOpen(true) }
      : null,
    onRemove ? { label: 'Remove', icon: Trash2Icon, onClick: onRemove } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <li className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
      <div className={cn(several ? ROW_GRID_SEVERAL : ROW_GRID_SINGLE, 'items-start')}>
        <Form.Field name={`backends.${index}.kind`}>
          <Form.Select>
            <Form.SelectItem value="url">URL</Form.SelectItem>
            <Form.SelectItem value="service">Service</Form.SelectItem>
          </Form.Select>
        </Form.Field>
        {isService ? (
          <ServiceTarget index={index} services={services} />
        ) : (
          <Form.Field name={`backends.${index}.endpointHost`} className="min-w-0">
            <ProtocolEndpointInput
              autoFocus={index === 0}
              protocolName={`backends.${index}.protocol`}
              endpointName={`backends.${index}.endpointHost`}
            />
          </Form.Field>
        )}
        {several ? (
          <>
            <Form.Field name={`backends.${index}.weight`}>
              <Form.Input
                type="number"
                min={0}
                max={MAX_BACKEND_WEIGHT}
                step={1}
                aria-label={`Weight for origin ${index + 1}`}
              />
            </Form.Field>
            <Text
              size="xs"
              textColor={share === 0 ? 'warning' : 'muted'}
              className="flex h-10 items-center justify-end tabular-nums">
              {share === undefined ? '' : share === 0 ? 'None' : `${Math.round(share * 100)}%`}
            </Text>
          </>
        ) : (
          // One origin takes all traffic; submit a weight so the field validates.
          <input type="hidden" name={`backends.${index}.weight`} value={String(row?.weight || 1)} />
        )}
        <div className="flex h-10 items-center justify-center">
          {menuItems.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  htmlType="button"
                  type="quaternary"
                  theme="borderless"
                  size="xs"
                  className="text-muted-foreground size-8 p-0"
                  aria-label={`Options for origin ${index + 1}`}>
                  <Icon icon={EllipsisIcon} size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menuItems.map((item) => (
                  <DropdownMenuItem key={item.label} onClick={item.onClick}>
                    <Icon icon={item.icon} size={14} />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      {serviceLine ? (
        <Text size="xs" textColor="muted" className="pl-[7rem]">
          {serviceLine} · plain HTTP
        </Text>
      ) : null}
      {showTls ? (
        <div className="pl-[7rem]">
          <Form.Field
            name={`backends.${index}.tlsHostname`}
            label="TLS hostname"
            required={isIp && https}
            tooltip={
              isIp
                ? "Hostname to present for SNI and to match the origin's certificate, since an IP address has none."
                : 'Overrides the hostname from the origin URL for SNI and certificate matching.'
            }>
            <Form.Input
              placeholder="e.g. secure.example.com"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </Form.Field>
        </div>
      ) : null}
    </li>
  );
}

function BackendsSection({
  projectId,
  usesConnector,
}: {
  projectId: string;
  usesConnector: boolean;
}) {
  const rows = (useWatch('backends') as WatchedRow[] | undefined) ?? [];
  const { data: services = [] } = useNetworkServices(projectId);
  const shares = backendTrafficShares(
    rows.map((row) => {
      const weight = Number(row?.weight);
      return { weight: row?.weight === '' || Number.isNaN(weight) ? 1 : weight };
    })
  );

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading
        title="Origins"
        description="Where this load balancer sends traffic: a URL, or a NetworkService in this project. With more than one, requests are split by weight."
      />
      <Form.FieldArray name="backends">
        {({ fields, append, remove }) => {
          const several = fields.length > 1;
          return (
            <>
              <div className={several ? ROW_GRID_SEVERAL : ROW_GRID_SINGLE}>
                <ColumnLabel>Type</ColumnLabel>
                <ColumnLabel>Origin</ColumnLabel>
                {several ? (
                  <>
                    <ColumnLabel>Weight</ColumnLabel>
                    <ColumnLabel className="text-right">Share</ColumnLabel>
                  </>
                ) : null}
                <span />
              </div>
              <ul className="divide-border -mt-1.5 flex flex-col divide-y">
                {fields.map((field, index) => (
                  <BackendRow
                    key={field.key}
                    index={index}
                    several={several}
                    share={several ? shares[index] : undefined}
                    services={services}
                    onRemove={several ? () => remove(index) : undefined}
                  />
                ))}
              </ul>
              {usesConnector ? (
                <Text size="xs" textColor="muted">
                  This origin is reached through a connector, which must be the only backend.
                </Text>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      htmlType="button"
                      type="quaternary"
                      theme="outline"
                      size="small"
                      className="w-fit">
                      <Icon icon={PlusIcon} className="size-4" />
                      Add origin
                      <Icon icon={ChevronDownIcon} className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => append(emptyBackendRow('url'))}>
                      <Icon icon={GlobeIcon} size={14} />
                      URL
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={services.length === 0}
                      onClick={() => append(emptyBackendRow('service'))}>
                      <Icon icon={NetworkIcon} size={14} />
                      {services.length === 0 ? 'Service (none in this project)' : 'Service'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          );
        }}
      </Form.FieldArray>
    </div>
  );
}

function LoadBalancingSection() {
  const type = useWatch('loadBalancer') as BackendsFormValues['loadBalancer'] | undefined;
  const hashOn = useWatch('hashOn') as BackendsFormValues['hashOn'] | undefined;

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading
        title="Load balancing"
        description="How requests are spread across origins. Only matters with more than one."
      />
      <Form.Field name="loadBalancer" label="Algorithm">
        <Form.Select>
          {LOAD_BALANCER_OPTIONS.map((option) => (
            <Form.SelectItem key={option.value} value={option.value}>
              {option.label}
            </Form.SelectItem>
          ))}
        </Form.Select>
      </Form.Field>
      <Text size="xs" textColor="muted">
        {LOAD_BALANCER_OPTIONS.find((option) => option.value === (type ?? 'default'))?.description}
      </Text>
      {type === 'ConsistentHash' ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Form.Field name="hashOn" label="Hash on" className="sm:w-48">
            <Form.Select>
              <Form.SelectItem value="SourceIP">Client IP address</Form.SelectItem>
              <Form.SelectItem value="Header">Request header</Form.SelectItem>
            </Form.Select>
          </Form.Field>
          {hashOn === 'Header' ? (
            <Form.Field name="hashHeader" label="Header name" required className="flex-1">
              <Form.Input
                placeholder="e.g. x-user-id"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </Form.Field>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function HealthCheckSection() {
  const enabled = useWatch('healthCheckEnabled') as boolean | string | undefined;
  const on = enabled === true || enabled === 'on';

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading
        title="Health checks"
        description="Stop sending traffic to an origin that keeps failing, then retry it later."
      />
      <Form.Field name="healthCheckEnabled">
        <label className="flex items-start gap-3">
          <Form.Checkbox className="mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <Text weight="medium" textColor="default">
              Passive health checks
            </Text>
            <Text size="xs" textColor="muted">
              Watches real responses. No extra probe requests are sent.
            </Text>
          </div>
        </label>
      </Form.Field>
      {on ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Form.Field
            name="consecutive5xxErrors"
            label="Failures"
            tooltip="Consecutive 5xx responses that take an origin out of rotation">
            <Form.Input type="number" min={1} step={1} />
          </Form.Field>
          <Form.Field
            name="baseEjectionTime"
            label="Out for"
            tooltip="How long it stays out the first time. Repeat failures multiply this.">
            <Form.Input placeholder="30s" autoCapitalize="none" spellCheck={false} />
          </Form.Field>
          <Form.Field
            name="maxEjectionPercent"
            label="Max out (%)"
            tooltip="The most origins that can be out at once, as a percentage">
            <Form.Input type="number" min={1} max={100} step={1} />
          </Form.Field>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Edit an ALB's backends (URL origins and NetworkServices, with weights and
 * TLS hostnames), its load-balancing algorithm, and passive health checks in
 * one save.
 */
export const ProxyBackendsDialog = forwardRef<ProxyBackendsDialogRef, ProxyBackendsDialogProps>(
  ({ projectId, onSuccess, onError }, ref) => {
    const [open, setOpen] = useState(false);
    const [proxy, setProxy] = useState<HttpProxy | null>(null);
    const [defaultValues, setDefaultValues] = useState<BackendsFormValues>();
    const keepOpenAfterError = useRef(false);

    const handleOpenChange = useCallback((next: boolean) => {
      if (!next && keepOpenAfterError.current) {
        keepOpenAfterError.current = false;
        return;
      }
      setOpen(next);
    }, []);

    const updateMutation = useUpdateHttpProxy(projectId, proxy?.name ?? '');

    const show = useCallback((proxyData: HttpProxy) => {
      setProxy(proxyData);
      setDefaultValues(toBackendsFormValues(proxyData));
      setOpen(true);
    }, []);

    const hide = useCallback(() => setOpen(false), []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const handleSubmit = async (data: BackendsFormValues) => {
      if (!proxy) return;
      try {
        await updateMutation.mutateAsync(toBackendsUpdateInput(data, proxy));
        toast.success('Application Load Balancer', { description: 'Backends saved' });
        setOpen(false);
        onSuccess?.();
      } catch (error) {
        showMutationErrorToast(error, {
          fallbackTitle: 'Application Load Balancer',
          fallbackDescription: (error as Error).message || 'Failed to save backends',
          scope: 'project',
          projectId,
        });
        onError?.(error as Error);
        // Form.Dialog closes after onSubmit returns and doesn't await a throw,
        // so skip that close instead: the edits stay on screen to fix.
        keepOpenAfterError.current = true;
      }
    };

    return (
      <Form.Dialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Edit backends"
        description="Choose the origins this load balancer forwards to and how traffic is split."
        schema={backendsFormSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitText="Save"
        submitTextLoading="Saving..."
        className="w-full focus:ring-0 focus:outline-none sm:max-w-2xl"
        // The <form> sits between the dialog's flex column and its header,
        // body, and footer. Making it a flex column lets the body shrink and
        // scroll so a long form can't push the footer out of view.
        formClassName="flex min-h-0 flex-1 flex-col">
        <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <BackendsSection projectId={projectId} usesConnector={!!proxy?.connector} />
          <LoadBalancingSection />
          <HealthCheckSection />
        </div>
      </Form.Dialog>
    );
  }
);

ProxyBackendsDialog.displayName = 'ProxyBackendsDialog';
