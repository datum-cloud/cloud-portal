import { type HttpProxy, useUpdateHttpProxy } from '@/resources/http-proxies';
import type { ProxyPathRule } from '@/resources/http-proxies/http-proxy.schema';
import { parseEndpoint } from '@/utils/helpers/url.helper';
import { isIPAddress } from '@/utils/helpers/validation.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { InputWithAddons } from '@datum-cloud/datum-ui/input-with-addons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { toast } from '@datum-cloud/datum-ui/toast';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { z } from 'zod';

function makePathsSchema(isTunnel: boolean) {
  const pathRow = z
    .object({
      name: z.string().optional(),
      matchType: z.enum(['Exact', 'PathPrefix']).default('PathPrefix'),
      matchValue: z
        .string()
        .trim()
        .min(1, { message: 'Path is required' })
        .refine((v) => v.startsWith('/'), { message: 'Path must start with /' }),
      protocol: z.enum(['http', 'https']).default('https'),
      endpointHost: z
        .string()
        .trim()
        .min(1, { message: 'Origin is required' })
        .refine((v) => !/[/?#]/.test(v), {
          message: 'Origin must be host or host:port only — no path, query, or fragment',
        }),
      tlsHostname: z.string().optional(),
      hostHeader: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      // Public proxies require an FQDN or IP (NSO admission); tunnel proxies
      // accept localhost / single-label hostnames because the request is
      // dialed inside the connector.
      if (!isTunnel && data.endpointHost) {
        const host = data.endpointHost.split(':')[0];
        const labels = host.split('.').filter(Boolean);
        if (!isIPAddress(host) && labels.length < 2) {
          ctx.addIssue({
            code: 'custom',
            path: ['endpointHost'],
            message: 'Origin must be a fully qualified domain (e.g. api.example.com) or IP',
          });
        }
      }

      if (
        data.protocol === 'https' &&
        data.endpointHost &&
        isIPAddress(data.endpointHost.split(':')[0]) &&
        !data.tlsHostname
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['tlsHostname'],
          message: 'TLS hostname is required for IP-based HTTPS endpoints',
        });
      }
    });

  return z.object({
    paths: z.array(pathRow).default([]),
  });
}

type PathRowValue = {
  name?: string;
  matchType: 'Exact' | 'PathPrefix';
  matchValue: string;
  protocol: 'http' | 'https';
  endpointHost: string;
  tlsHostname?: string;
  hostHeader?: string;
};

type PathsSchemaValue = { paths: PathRowValue[] };

function toRow(p: ProxyPathRule): PathRowValue {
  const { protocol, endpointHost } = parseEndpoint(p.endpoint);
  return {
    name: p.name,
    matchType: p.match.type,
    matchValue: p.match.value,
    protocol,
    endpointHost,
    tlsHostname: p.tlsHostname,
    hostHeader: p.hostHeader,
  };
}

function toRule(
  row: PathRowValue,
  inheritedConnector: { name: string } | undefined
): ProxyPathRule {
  return {
    ...(row.name ? { name: row.name } : {}),
    match: { type: row.matchType, value: row.matchValue.trim() },
    endpoint: `${row.protocol}://${row.endpointHost.trim()}`,
    ...(row.tlsHostname && { tlsHostname: row.tlsHostname.trim() }),
    ...(row.hostHeader && row.hostHeader.trim() && { hostHeader: row.hostHeader.trim() }),
    ...(inheritedConnector && { connector: inheritedConnector }),
  };
}

export interface ProxyPathsDialogRef {
  show: (proxy: HttpProxy) => void;
  hide: () => void;
}

interface ProxyPathsDialogProps {
  projectId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const ProxyPathsDialog = forwardRef<ProxyPathsDialogRef, ProxyPathsDialogProps>(
  function ProxyPathsDialog({ projectId, onSuccess, onError }, ref) {
    const [open, setOpen] = useState(false);
    const [proxyName, setProxyName] = useState('');
    const [proxy, setProxy] = useState<HttpProxy | null>(null);
    const [defaultValues, setDefaultValues] = useState<Partial<PathsSchemaValue>>();

    const updateMutation = useUpdateHttpProxy(projectId, proxyName);
    const inheritedConnector = proxy?.connector;
    const isTunnel = !!inheritedConnector;
    const schema = useMemo(() => makePathsSchema(isTunnel), [isTunnel]);

    const show = useCallback((p: HttpProxy) => {
      setProxy(p);
      setProxyName(p.name);
      setDefaultValues({ paths: (p.extraPaths ?? []).map(toRow) });
      setOpen(true);
    }, []);

    const hide = useCallback(() => setOpen(false), []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const handleSubmit = async (data: PathsSchemaValue) => {
      if (!proxy) return;
      try {
        await updateMutation.mutateAsync({
          extraPaths: data.paths.map((r) => toRule(r, inheritedConnector)),
        });
        toast.success('AI Edge', { description: 'Paths updated successfully' });
        setOpen(false);
        onSuccess?.();
      } catch (error) {
        toast.error('AI Edge', {
          description: (error as Error).message || 'Failed to update paths',
        });
        onError?.(error as Error);
      }
    };

    return (
      <Form.Dialog
        open={open}
        onOpenChange={setOpen}
        title="Edit Paths"
        description="Route specific paths to different origins. Requests that don't match any path fall through to the default origin."
        schema={schema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitText="Save"
        submitTextLoading="Saving..."
        className="w-full focus:ring-0 focus:outline-none sm:max-w-3xl">
        <div className="space-y-4 px-5">
          {isTunnel && (
            <p className="text-muted-foreground text-xs">
              Paths tunnel through{' '}
              <span className="text-foreground font-medium">{inheritedConnector?.name}</span>.
              Origins can use <code className="text-xs">localhost</code> and bind to local ports.
            </p>
          )}

          <Form.FieldArray name="paths">
            {({ fields, append, remove }) => (
              <div className="space-y-3">
                {fields.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    No additional paths. Requests fall through to the default origin.
                  </p>
                )}

                {fields.map((field, index) => (
                  <PathRow
                    key={field.key}
                    index={index}
                    onRemove={() => remove(index)}
                    isTunnel={isTunnel}
                  />
                ))}

                <Button
                  type="secondary"
                  theme="outline"
                  size="small"
                  className="w-fit gap-1.5"
                  onClick={() =>
                    append({
                      matchType: 'PathPrefix',
                      matchValue: '/',
                      protocol: isTunnel ? 'http' : 'https',
                      endpointHost: '',
                    })
                  }>
                  <Icon icon={PlusIcon} className="size-4" />
                  Add path
                </Button>
              </div>
            )}
          </Form.FieldArray>

          {proxy?.endpoint && (
            <div className="border-border rounded-md border border-dashed p-3 text-xs">
              <span className="text-muted-foreground">Default origin (catch-all):</span>{' '}
              <span className="font-medium">{proxy.endpoint}</span>
            </div>
          )}
        </div>
      </Form.Dialog>
    );
  }
);

ProxyPathsDialog.displayName = 'ProxyPathsDialog';

function PathRow({
  index,
  onRemove,
  isTunnel,
}: {
  index: number;
  onRemove: () => void;
  isTunnel: boolean;
}) {
  const prefix = `paths.${index}`;

  return (
    <div className="border-border bg-card/30 space-y-3 rounded-md border p-3">
      <div className="flex items-start gap-2">
        <Form.Field
          name={`${prefix}.matchType`}
          label={index === 0 ? 'Match' : undefined}
          className="w-32">
          {({ control }) => (
            <Select
              value={(control.value as string) || 'PathPrefix'}
              onValueChange={control.change}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Exact">Exact</SelectItem>
                <SelectItem value="PathPrefix">Prefix</SelectItem>
              </SelectContent>
            </Select>
          )}
        </Form.Field>

        <Form.Field
          name={`${prefix}.matchValue`}
          label={index === 0 ? 'Path' : undefined}
          className="flex-1">
          {({ control }) => (
            <Input
              value={(control.value as string) ?? ''}
              onChange={(e) => control.change(e.target.value)}
              onBlur={control.blur}
              placeholder="/api"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          )}
        </Form.Field>

        <Button
          type="danger"
          theme="borderless"
          size="icon"
          className="mt-6"
          aria-label="Remove path"
          onClick={onRemove}>
          <Icon icon={TrashIcon} className="size-4" />
        </Button>
      </div>

      <Form.Field name={`${prefix}.endpointHost`} label="Origin" required>
        {({ control }) => {
          const protocolName = `${prefix}.protocol`;
          return (
            <ProtocolEndpointRow
              endpointControl={control}
              protocolName={protocolName}
              placeholder={isTunnel ? 'localhost:3000' : 'e.g. api.example.com'}
            />
          );
        }}
      </Form.Field>

      <div className="grid grid-cols-2 gap-3">
        <Form.Field name={`${prefix}.tlsHostname`} label="TLS hostname">
          <Form.Input
            placeholder="e.g. secure.example.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Form.Field>

        <Form.Field name={`${prefix}.hostHeader`} label="Host header">
          <Form.Input
            placeholder="e.g. api.internal"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={253}
          />
        </Form.Field>
      </div>
    </div>
  );
}

function ProtocolEndpointRow({
  endpointControl,
  protocolName,
  placeholder,
}: {
  endpointControl: { value: unknown; change: (v: string) => void; blur: () => void };
  protocolName: string;
  placeholder?: string;
}) {
  const { control: protocolControl } = Form.useField(protocolName);
  const protocolValue = (protocolControl.value as string) || 'https';
  const endpointValue = (endpointControl.value as string) || '';

  return (
    <InputWithAddons
      leading={
        <Select value={protocolValue} onValueChange={protocolControl.change}>
          <SelectTrigger className="bg-accent h-6 min-h-6 gap-1 border px-2 py-0 shadow-none focus:ring-0 focus-visible:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="http">http</SelectItem>
            <SelectItem value="https">https</SelectItem>
          </SelectContent>
        </Select>
      }
      value={endpointValue}
      onChange={(e) => endpointControl.change(e.target.value)}
      onBlur={endpointControl.blur}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      placeholder={placeholder ?? 'e.g. api.example.com'}
      className="text-xs!"
    />
  );
}
