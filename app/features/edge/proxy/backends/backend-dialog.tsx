import { ProtocolEndpointInput } from '@/features/edge/proxy/form/protocol-endpoint-input';
import { ProxyTlsField } from '@/features/edge/proxy/form/tls-field';
import type { ProxyBackend } from '@/resources/http-proxies';
import { useNetworkServices } from '@/resources/network-services';
import { parseEndpoint } from '@/utils/helpers/url.helper';
import { isIPAddress } from '@/utils/helpers/validation.helper';
import { Form } from '@datum-cloud/datum-ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { z } from 'zod';

/**
 * Mirrors the API's CEL constraints so a bad combination is caught before the
 * round trip rather than coming back as a server rejection.
 */
const backendFormSchema = z
  .object({
    kind: z.enum(['endpoint', 'networkService']).default('endpoint'),
    protocol: z.enum(['http', 'https']).default('https'),
    endpointHost: z.string().optional(),
    // Allow empty so clearing TLS validates and is sent as an explicit clear.
    tlsHostname: z.string().max(253).optional(),
    networkServiceName: z.string().optional(),
    networkServicePort: z.string().optional(),
    weight: z.coerce.number().int().min(0).max(1_000_000).default(1),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'endpoint') {
      if (!value.endpointHost?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['endpointHost'], message: 'Backend is required' });
        return;
      }
      // The API requires a TLS hostname for an HTTPS backend addressed by IP:
      // there is no hostname in the URL for a certificate to match.
      const host = value.endpointHost.split(':')[0];
      if (value.protocol === 'https' && isIPAddress(host) && !value.tlsHostname?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['tlsHostname'],
          message: 'A TLS hostname is required for an HTTPS backend addressed by IP.',
        });
      }
      return;
    }

    if (!value.networkServiceName) {
      ctx.addIssue({
        code: 'custom',
        path: ['networkServiceName'],
        message: 'Select a network service',
      });
    }
    if (!value.networkServicePort) {
      ctx.addIssue({ code: 'custom', path: ['networkServicePort'], message: 'Select a port' });
    }
  });

type BackendFormSchema = z.infer<typeof backendFormSchema>;

export interface ProxyBackendDialogRef {
  /** Omit `backend` to add a new one to the route. */
  show: (backend?: ProxyBackend) => void;
  hide: () => void;
}

/** Name + port pickers, which depend on each other and on the loaded list. */
function NetworkServiceFields({ projectId }: { projectId: string }) {
  const { data: services, isLoading } = useNetworkServices(projectId);
  const nameField = Form.useField('networkServiceName');
  const portField = Form.useField('networkServicePort');
  const selectedName = Form.useWatch<string>('networkServiceName');

  const selected = useMemo(
    () => services?.find((s) => s.name === selectedName),
    [services, selectedName]
  );

  return (
    <>
      <Form.Field
        name="networkServiceName"
        label="Network service"
        required
        description="Every member the service resolves to becomes an endpoint of this backend.">
        {({ control }) => (
          <Select
            value={(control.value as string) ?? ''}
            onValueChange={(value) => {
              control.change(value);
              // The previous port belongs to a different service, so it cannot
              // carry over — clearing it forces a deliberate re-pick.
              portField.control.change('');
            }}>
            <SelectTrigger data-e2e="alb-backend-network-service">
              <SelectValue
                placeholder={isLoading ? 'Loading services…' : 'Select a network service'}
              />
            </SelectTrigger>
            <SelectContent>
              {(services ?? []).map((service) => (
                <SelectItem key={service.name} value={service.name}>
                  <span className="flex items-center gap-2">
                    {service.name}
                    {/* A service written before its workload exists is the
                        ordinary case, so this is a note, not a blocker. */}
                    {!service.ready ? (
                      <span className="text-muted-foreground text-xs">
                        · {service.membersResolved ? 'not serving yet' : 'no members yet'}
                      </span>
                    ) : null}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Form.Field>

      <Form.Field
        name="networkServicePort"
        label="Port"
        required
        description="Ports are referenced by name, so the backend survives a port number change.">
        {({ control }) => (
          <Select
            value={(control.value as string) ?? ''}
            onValueChange={control.change}
            disabled={!selected}>
            <SelectTrigger data-e2e="alb-backend-network-service-port">
              <SelectValue
                placeholder={selected ? 'Select a port' : 'Select a network service first'}
              />
            </SelectTrigger>
            <SelectContent>
              {(selected?.ports ?? []).map((port) => (
                <SelectItem key={port.name} value={port.name}>
                  {port.name} · {port.port}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Form.Field>
      {/* Keep the field registered even when the name picker is empty. */}
      <input type="hidden" name={nameField.meta.name} />
    </>
  );
}

function EndpointFields() {
  const [isIPOrigin, setIsIPOrigin] = useState(false);
  const [protocol, setProtocol] = useState('https');

  return (
    <>
      <Form.Field
        name="endpointHost"
        label="Backend"
        tooltip="The hostname or IP address where your service is running"
        required>
        <ProtocolEndpointInput
          autoFocus
          onIPChange={setIsIPOrigin}
          onProtocolChange={setProtocol}
        />
      </Form.Field>
      {isIPOrigin && <ProxyTlsField required={protocol === 'https'} />}
    </>
  );
}

function KindDependentFields({ projectId, lockKind }: { projectId: string; lockKind: boolean }) {
  const kind = Form.useWatch<string>('kind');

  return (
    <>
      <Form.Field
        name="kind"
        label="Type"
        description={
          lockKind
            ? 'Changing the type of an existing backend means removing it and adding a new one.'
            : undefined
        }>
        {({ control }) => (
          <Select
            value={(control.value as string) ?? 'endpoint'}
            onValueChange={control.change}
            disabled={lockKind}>
            <SelectTrigger data-e2e="alb-backend-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="endpoint">URL endpoint</SelectItem>
              <SelectItem value="networkService">Network service</SelectItem>
            </SelectContent>
          </Select>
        )}
      </Form.Field>

      {kind === 'networkService' ? (
        <NetworkServiceFields projectId={projectId} />
      ) : (
        <EndpointFields />
      )}

      <Form.Field
        name="weight"
        label="Weight"
        description="Share of traffic relative to the other backends on this route. 0 takes this backend out of rotation without removing it.">
        <Form.Input type="number" min={0} max={1000000} step={1} />
      </Form.Field>
    </>
  );
}

export const ProxyBackendDialog = forwardRef<
  ProxyBackendDialogRef,
  {
    projectId: string;
    /** Resolves when the parent has persisted the change. */
    onSubmit: (backend: ProxyBackend, original?: ProxyBackend) => Promise<void>;
    saving?: boolean;
  }
>(({ projectId, onSubmit, saving }, ref) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProxyBackend | undefined>();
  const [defaultValues, setDefaultValues] = useState<Partial<BackendFormSchema>>();

  const show = useCallback((backend?: ProxyBackend) => {
    setEditing(backend);

    if (!backend) {
      setDefaultValues({ kind: 'endpoint', protocol: 'https', weight: 1 });
    } else if (backend.kind === 'networkService') {
      setDefaultValues({
        kind: 'networkService',
        networkServiceName: backend.networkService?.name,
        networkServicePort: backend.networkService?.port,
        weight: backend.weight,
      });
    } else {
      const { protocol, endpointHost } = parseEndpoint(backend.endpoint);
      setDefaultValues({
        kind: 'endpoint',
        protocol,
        endpointHost,
        tlsHostname: backend.tlsHostname,
        weight: backend.weight,
      });
    }

    setOpen(true);
  }, []);

  const hide = useCallback(() => setOpen(false), []);
  useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

  const handleSubmit = async (data: BackendFormSchema) => {
    const next: ProxyBackend =
      data.kind === 'networkService'
        ? {
            key: editing?.key ?? `new:${Date.now()}`,
            kind: 'networkService',
            networkService: {
              name: data.networkServiceName!,
              port: data.networkServicePort!,
            },
            weight: data.weight,
            editable: true,
          }
        : {
            key: editing?.key ?? `new:${Date.now()}`,
            kind: 'endpoint',
            endpoint: `${data.protocol}://${data.endpointHost!.trim()}`,
            ...(data.tlsHostname?.trim() ? { tlsHostname: data.tlsHostname.trim() } : {}),
            weight: data.weight,
            editable: true,
          };

    await onSubmit(next, editing);
    setOpen(false);
  };

  return (
    <Form.Dialog
      open={open}
      onOpenChange={setOpen}
      title={editing ? 'Edit backend' : 'Add backend'}
      description={
        editing
          ? 'Update where this backend sends traffic and how much of it.'
          : 'Send a share of this route’s traffic to another backend.'
      }
      schema={backendFormSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      loading={saving}
      submitText={editing ? 'Save' : 'Add backend'}
      submitTextLoading="Saving..."
      className="w-full sm:max-w-2xl">
      <div className="flex flex-col gap-5">
        <KindDependentFields projectId={projectId} lockKind={!!editing} />
      </div>
    </Form.Dialog>
  );
});

ProxyBackendDialog.displayName = 'ProxyBackendDialog';
