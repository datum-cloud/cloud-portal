import { showMutationErrorToast } from '@/modules/quota';
import {
  useUpdateProxyLoadBalancer,
  type HttpProxy,
  type ProxyLoadBalancer,
} from '@/resources/http-proxies';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Share2Icon } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

/**
 * The default shown for a proxy that has never set one.
 *
 * Leaving spec.loadBalancer unset attaches no BackendTrafficPolicy at all, so
 * the data plane applies its own default — round robin. Showing "Round robin"
 * for an unset proxy therefore describes what is actually happening, and
 * spares the operator a "not set" option that only ever meant this anyway.
 *
 * Deliberately a display fallback and not a write: visiting a page should not
 * mutate the resource. The value is persisted the moment the operator picks
 * anything, at which point it stops depending on the data plane's default.
 */
const DEFAULT_ALGORITHM = 'RoundRobin';

/**
 * Deliberately labels only. Per-item descriptions were added to explain what
 * "Envoy default" did; that option no longer exists, and the descriptions
 * wrapped to two lines each, turning a four-item picker into a wall. These are
 * standard load-balancer terms for the people choosing between them.
 */
const ALGORITHMS = [
  { value: 'RoundRobin', label: 'Round robin' },
  { value: 'Random', label: 'Random' },
  { value: 'LeastRequest', label: 'Least request' },
  { value: 'ConsistentHash', label: 'Consistent hash' },
] as const;

const hashSchema = z
  .object({
    source: z.enum(['SourceIP', 'Header']).default('SourceIP'),
    header: z.string().max(256).optional(),
  })
  .superRefine((value, ctx) => {
    // The API requires a header name when hashing on a header, and forbids one
    // otherwise, so ask for it here rather than let the write come back 422.
    if (value.source === 'Header' && !value.header?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['header'],
        message: 'A header name is required when hashing on a header.',
      });
    }
  });

type HashSchema = z.infer<typeof hashSchema>;

/**
 * The load balancing algorithm, which is proxy-scoped rather than per route.
 *
 * Weights apply whatever is chosen here — this decides how the remaining
 * selection is made, not whether weighting happens. That is why there is no
 * "weighted round robin" entry despite it being the usual way of saying it:
 * round robin already honours weights.
 */
export const ProxyAlgorithmSelect = ({
  proxy,
  projectId,
  canEdit,
}: {
  proxy: HttpProxy;
  projectId: string;
  canEdit: boolean;
}) => {
  const current = proxy.loadBalancer;
  const [hashOpen, setHashOpen] = useState(false);
  const mutation = useUpdateProxyLoadBalancer(projectId, proxy.name);

  const save = async (next: ProxyLoadBalancer | null) => {
    try {
      await mutation.mutateAsync(next);
      toast.success('Application Load Balancer', {
        description: 'Load balancing algorithm updated',
      });
      return true;
    } catch (error) {
      showMutationErrorToast(error, {
        fallbackTitle: 'Application Load Balancer',
        fallbackDescription: (error as Error).message || 'Failed to update the algorithm',
        scope: 'project',
        projectId,
      });
      return false;
    }
  };

  const handleChange = (value: string) => {
    // Consistent hash is incomplete without a hash source, so collect that
    // before writing anything rather than saving a half-configured policy.
    if (value === 'ConsistentHash') {
      setHashOpen(true);
      return;
    }
    void save({ type: value } as ProxyLoadBalancer);
  };

  const handleHashSubmit = async (data: HashSchema) => {
    const saved = await save({
      type: 'ConsistentHash',
      consistentHash: {
        type: data.source,
        ...(data.source === 'Header' ? { header: data.header!.trim() } : {}),
      },
    });
    if (saved) setHashOpen(false);
  };

  const selected = current?.type ?? DEFAULT_ALGORITHM;
  const label = ALGORITHMS.find((a) => a.value === selected)?.label ?? selected;
  const hashNote =
    current?.type === 'ConsistentHash'
      ? current.consistentHash?.type === 'Header'
        ? ` · ${current.consistentHash.header}`
        : ' · source IP'
      : '';

  return (
    <>
      <div className="flex shrink-0 flex-col gap-1">
        <span className="text-muted-foreground text-xs font-medium">Algorithm</span>
        {canEdit ? (
          <Select value={selected} onValueChange={handleChange} disabled={mutation.isPending}>
            {/* Left with its own border and sizing. An earlier version stripped
                those and nested it inside a hand-rolled box, which rendered as
                a box within a box. */}
            <SelectTrigger
              className="bg-card h-9 w-52 gap-2"
              aria-label="Load balancing algorithm"
              data-e2e="alb-algorithm-select">
              <Icon icon={Share2Icon} size={14} className="text-muted-foreground shrink-0" />
              {/* Children, rather than the default, so the trigger can append
                  the hash source — which belongs to the selection but not to
                  any one menu item. flex-1 because the trigger is
                  justify-between, which otherwise centres the value. */}
              <SelectValue>
                <span className="flex-1 truncate text-left">
                  {label}
                  {hashNote}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              {ALGORITHMS.map((algorithm) => (
                <SelectItem key={algorithm.value} value={algorithm.value}>
                  <span className="whitespace-nowrap">{algorithm.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="border-border bg-card flex h-9 w-56 items-center gap-2 rounded-md border px-3 text-sm">
            <Icon icon={Share2Icon} size={14} className="text-muted-foreground shrink-0" />
            <span className="truncate">
              {label}
              {hashNote}
            </span>
          </span>
        )}
      </div>

      <Form.Dialog
        open={hashOpen}
        onOpenChange={setHashOpen}
        title="Consistent hash"
        description="Requests that hash the same way go to the same backend, so a client keeps landing on the same one while the pool is stable."
        schema={hashSchema}
        defaultValues={{
          source: current?.consistentHash?.type ?? 'SourceIP',
          header: current?.consistentHash?.header ?? '',
        }}
        onSubmit={handleHashSubmit}
        loading={mutation.isPending}
        submitText="Save"
        submitTextLoading="Saving..."
        className="w-full sm:max-w-lg">
        <HashFields />
      </Form.Dialog>
    </>
  );
};

function HashFields() {
  const source = Form.useWatch<string>('source');

  return (
    <div className="flex flex-col gap-5">
      <Form.Field name="source" label="Hash on">
        {({ control }) => (
          <Select value={(control.value as string) ?? 'SourceIP'} onValueChange={control.change}>
            <SelectTrigger data-e2e="alb-algorithm-hash-source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SourceIP">Client&rsquo;s source IP</SelectItem>
              <SelectItem value="Header">Request header</SelectItem>
            </SelectContent>
          </Select>
        )}
      </Form.Field>

      {source === 'Header' ? (
        <Form.Field name="header" label="Header name" required>
          <Form.Input
            placeholder="e.g. x-user-id"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Form.Field>
      ) : null}
    </div>
  );
}
