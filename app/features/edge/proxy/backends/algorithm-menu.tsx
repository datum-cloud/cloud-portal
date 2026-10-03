import {
  ALGORITHM_OPTIONS,
  algorithmLabel,
  algorithmValue,
  type AlgorithmValue,
} from './backend-pool';
import { showMutationErrorToast } from '@/modules/quota';
import {
  type HttpProxy,
  type HttpProxyLoadBalancer,
  useUpdateHttpProxy,
} from '@/resources/http-proxies';
import { Button } from '@datum-cloud/datum-ui/button';
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
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { PencilIcon, ShuffleIcon } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

const consistentHashSchema = z
  .object({
    hashOn: z.enum(['SourceIP', 'Header']).default('SourceIP'),
    header: z.string().trim().max(256, 'Header names must be 256 characters or fewer').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hashOn !== 'Header') return;
    if (!data.header) {
      ctx.addIssue({ code: 'custom', message: 'Header name is required', path: ['header'] });
    } else if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(data.header)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a valid header name, such as x-user-id',
        path: ['header'],
      });
    }
  });

type ConsistentHashValues = z.infer<typeof consistentHashSchema>;

/**
 * The pool's load balancing algorithm (`spec.loadBalancer`). Choosing
 * consistent hash opens a dialog for the hash key; the rest apply at once.
 */
export function AlgorithmMenu({
  proxy,
  projectId,
  disabledReason,
}: {
  proxy: HttpProxy;
  projectId: string;
  /** Set when the viewer can't change the algorithm; shown as a tooltip. */
  disabledReason?: string;
}) {
  const [hashOpen, setHashOpen] = useState(false);
  const updateMutation = useUpdateHttpProxy(projectId, proxy.name);
  const current = algorithmValue(proxy.loadBalancer);

  const save = async (loadBalancer: HttpProxyLoadBalancer | null) => {
    try {
      await updateMutation.mutateAsync({ loadBalancer });
      toast.success('Application Load Balancer', {
        description: `Algorithm set to ${algorithmLabel(loadBalancer ?? undefined).toLowerCase()}`,
      });
    } catch (error) {
      showMutationErrorToast(error, {
        fallbackTitle: 'Application Load Balancer',
        fallbackDescription: (error as Error).message || 'Failed to change the algorithm',
        scope: 'project',
        projectId,
      });
      throw error;
    }
  };

  const select = (value: string) => {
    const next = value as AlgorithmValue;
    // Consistent hash needs a hash key, so collect it before writing anything.
    if (next === 'ConsistentHash') {
      setHashOpen(true);
      return;
    }
    if (next === current) return;
    void save({ type: next }).catch(() => undefined);
  };

  const hash = proxy.loadBalancer?.consistentHash;
  const disabled = !!disabledReason || updateMutation.isPending;

  const control = (
    <Select value={current} onValueChange={select} disabled={disabled}>
      {/* One line, the same height as the Add backend button beside it. min-h-9
          overrides the trigger's own min-h-10, which otherwise wins over h-9, and
          rounded-lg is the Button's radius (the trigger defaults to rounded-md). */}
      <SelectTrigger
        className="bg-card h-9.5 min-h-9.5 w-full gap-2 sm:w-auto"
        aria-label="Load balancing algorithm"
        data-e2e="alb-backends-algorithm">
        {/* Shuffle fills its box; 12 matches the visual size of the button's 14px plus. */}
        <Icon icon={ShuffleIcon} size={12} className="text-muted-foreground shrink-0" />
        <Text as="span" size="sm" textColor="muted" className="shrink-0">
          Algorithm
        </Text>
        {/* Children rather than the item's text, so the hint isn't cloned in
            and the hash key, which no single item carries, can be shown. */}
        <SelectValue>
          <Text as="span" size="sm" weight="medium" ellipsis>
            {algorithmLabel(proxy.loadBalancer)}
          </Text>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-72">
        {ALGORITHM_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="whitespace-nowrap">{option.label}</span>
              <Text as="span" size="xs" textColor="muted" className="whitespace-nowrap">
                {option.description}
              </Text>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    // Fills the toolbar row on mobile, sits at its own width from sm up.
    <div className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none">
      {disabledReason ? (
        <Tooltip message={disabledReason} contentClassName="max-w-xs text-pretty">
          <span className="block min-w-0 flex-1">{control}</span>
        </Tooltip>
      ) : (
        control
      )}
      {/* Re-picking the selected item doesn't fire onValueChange, so the hash
          key gets its own way back in. */}
      {current === 'ConsistentHash' && !disabled ? (
        <Button
          type="quaternary"
          theme="borderless"
          size="xs"
          className="text-muted-foreground size-9 p-0"
          aria-label="Edit consistent hash key"
          onClick={() => setHashOpen(true)}>
          <Icon icon={PencilIcon} size={14} />
        </Button>
      ) : null}

      <Form.Dialog
        open={hashOpen}
        onOpenChange={setHashOpen}
        title="Consistent hash"
        description="Requests that hash the same way go to the same backend while the pool is stable."
        schema={consistentHashSchema}
        defaultValues={{
          hashOn: hash?.type ?? 'SourceIP',
          header: hash?.header ?? '',
        }}
        onSubmit={async (data: ConsistentHashValues) => {
          await save({
            type: 'ConsistentHash',
            consistentHash:
              data.hashOn === 'Header'
                ? { type: 'Header', header: data.header }
                : { type: 'SourceIP' },
          });
          setHashOpen(false);
        }}
        submitText="Save"
        submitTextLoading="Saving..."
        className="w-full focus:ring-0 focus:outline-none sm:max-w-md">
        {/* Same divided, padded sections as the other ALB dialogs. */}
        <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <Form.Field name="hashOn" label="Hash on" required>
            <Form.RadioGroup orientation="vertical">
              <Form.RadioItem
                value="SourceIP"
                label="Client IP"
                description="Each client address sticks to one backend."
              />
              <Form.RadioItem
                value="Header"
                label="Request header"
                description="Requests with the same header value stick to one backend."
              />
            </Form.RadioGroup>
          </Form.Field>
          <Form.When field="hashOn" is="Header">
            <Form.Field name="header" label="Header name" required>
              <Form.Input
                placeholder="e.g. x-user-id"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </Form.Field>
          </Form.When>
        </div>
      </Form.Dialog>
    </div>
  );
}
