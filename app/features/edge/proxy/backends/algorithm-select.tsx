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

const UNSET = 'unset';

/**
 * Leaving spec.loadBalancer unset attaches no policy at all, so the data plane
 * applies its own default — round robin. "Not set" says that plainly; naming
 * Envoy leaked an implementation detail and still left the question of what
 * actually happens unanswered.
 */
const ALGORITHMS = [
  {
    value: UNSET,
    label: 'Not set',
    hint: 'Let the load balancer choose. Today that means round robin.',
  },
  { value: 'RoundRobin', label: 'Round robin', hint: 'Cycles through backends in order.' },
  { value: 'Random', label: 'Random', hint: 'Picks a backend at random.' },
  {
    value: 'LeastRequest',
    label: 'Least request',
    hint: 'Picks the backend with the fewest requests in flight.',
  },
  {
    value: 'ConsistentHash',
    label: 'Consistent hash',
    hint: 'Sends requests that hash alike to the same backend.',
  },
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
    void save(value === UNSET ? null : ({ type: value } as ProxyLoadBalancer));
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

  const label = current
    ? (ALGORITHMS.find((a) => a.value === current.type)?.label ?? current.type)
    : 'Not set';
  const hashNote =
    current?.type === 'ConsistentHash'
      ? current.consistentHash?.type === 'Header'
        ? ` · ${current.consistentHash.header}`
        : ' · source IP'
      : '';

  return (
    <>
      <div className="border-border bg-card flex h-12 shrink-0 items-center gap-2 rounded-md border px-3">
        <Icon icon={Share2Icon} size={16} className="text-muted-foreground shrink-0" />
        <div className="flex min-w-0 flex-col">
          <span className="text-muted-foreground text-2xs leading-none">Algorithm</span>
          {canEdit ? (
            <Select
              value={current?.type ?? UNSET}
              onValueChange={handleChange}
              disabled={mutation.isPending}>
              <SelectTrigger
                className="h-auto border-0 p-0 text-sm font-medium whitespace-nowrap shadow-none focus:ring-0 focus-visible:ring-0"
                aria-label="Load balancing algorithm"
                data-e2e="alb-algorithm-select">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              {/* The trigger is deliberately narrow, and the menu inherits its
                  width by default — which wrapped every label onto two lines. */}
              <SelectContent align="end" className="min-w-80">
                {ALGORITHMS.map((algorithm) => (
                  <SelectItem key={algorithm.value} value={algorithm.value}>
                    <span className="flex flex-col items-start gap-0.5">
                      <span className="whitespace-nowrap">{algorithm.label}</span>
                      <span className="text-muted-foreground text-xs">{algorithm.hint}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="truncate text-sm font-medium">
              {label}
              {hashNote}
            </span>
          )}
        </div>
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
