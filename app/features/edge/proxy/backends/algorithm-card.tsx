import { FieldLabel } from '@/components/card';
import { showMutationErrorToast } from '@/modules/quota';
import { PermissionButton } from '@/modules/rbac';
import {
  useUpdateProxyLoadBalancer,
  type HttpProxy,
  type ProxyLoadBalancer,
} from '@/resources/http-proxies';
import {
  Card,
  CardAction,
  CardContent,
  CardField,
  CardFieldValue,
  CardHeader,
  CardSaveBar,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { toast } from '@datum-cloud/datum-ui/toast';
import { PencilIcon, Share2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';

const UNSET = 'unset';

const ALGORITHMS = [
  { value: UNSET, label: 'Envoy default', hint: 'Whatever Envoy applies when nothing is set' },
  { value: 'RoundRobin', label: 'Round robin', hint: 'Cycles through backends in order' },
  { value: 'Random', label: 'Random', hint: 'Picks a backend uniformly at random' },
  {
    value: 'LeastRequest',
    label: 'Least request',
    hint: 'Picks the backend with the fewest active requests',
  },
  {
    value: 'ConsistentHash',
    label: 'Consistent hash',
    hint: 'Sends requests that hash the same way to the same backend',
  },
] as const;

const HASH_SOURCES = [
  { value: 'SourceIP', label: "Client's source IP" },
  { value: 'Header', label: 'Request header' },
] as const;

function describe(lb: ProxyLoadBalancer | undefined): string {
  if (!lb) return 'Envoy default';
  const label = ALGORITHMS.find((a) => a.value === lb.type)?.label ?? lb.type;
  if (lb.type !== 'ConsistentHash') return label;
  if (lb.consistentHash?.type === 'Header') {
    return `${label} · ${lb.consistentHash.header ?? 'header'}`;
  }
  return `${label} · source IP`;
}

/**
 * The load balancing algorithm, which is proxy-scoped rather than per route.
 *
 * Weights apply whatever is chosen here — this decides how the remaining
 * selection is made, not whether weighting happens. That is why there is no
 * "weighted round robin" option, despite it being the usual way of saying it.
 */
export const ProxyAlgorithmCard = ({
  proxy,
  projectId,
  canEdit,
}: {
  proxy: HttpProxy;
  projectId: string;
  canEdit: boolean;
}) => {
  const current = proxy.loadBalancer;
  const [editing, setEditing] = useState(false);
  const [draftType, setDraftType] = useState<string>(current?.type ?? UNSET);
  const [draftHashSource, setDraftHashSource] = useState<string>(
    current?.consistentHash?.type ?? 'SourceIP'
  );
  const [draftHeader, setDraftHeader] = useState(current?.consistentHash?.header ?? '');

  const mutation = useUpdateProxyLoadBalancer(projectId, proxy.name);

  const headerRequired = draftType === 'ConsistentHash' && draftHashSource === 'Header';
  const headerMissing = headerRequired && !draftHeader.trim();

  const changeCount = useMemo(() => {
    const before = describe(current);
    const after = describe(
      draftType === UNSET
        ? undefined
        : ({
            type: draftType,
            ...(draftType === 'ConsistentHash'
              ? {
                  consistentHash: {
                    type: draftHashSource,
                    ...(draftHashSource === 'Header' ? { header: draftHeader.trim() } : {}),
                  },
                }
              : {}),
          } as ProxyLoadBalancer)
    );
    return before === after ? 0 : 1;
  }, [current, draftType, draftHashSource, draftHeader]);

  const startEditing = () => {
    setDraftType(current?.type ?? UNSET);
    setDraftHashSource(current?.consistentHash?.type ?? 'SourceIP');
    setDraftHeader(current?.consistentHash?.header ?? '');
    setEditing(true);
  };

  const handleSave = async () => {
    const next: ProxyLoadBalancer | null =
      draftType === UNSET
        ? null
        : ({
            type: draftType,
            ...(draftType === 'ConsistentHash'
              ? {
                  consistentHash: {
                    type: draftHashSource,
                    ...(draftHashSource === 'Header' ? { header: draftHeader.trim() } : {}),
                  },
                }
              : {}),
          } as ProxyLoadBalancer);

    try {
      await mutation.mutateAsync(next);
      toast.success('Application Load Balancer', {
        description: 'Load balancing algorithm updated',
      });
      setEditing(false);
    } catch (error) {
      showMutationErrorToast(error, {
        fallbackTitle: 'Application Load Balancer',
        fallbackDescription: (error as Error).message || 'Failed to update the algorithm',
        scope: 'project',
        projectId,
      });
    }
  };

  return (
    <Card size="sm" sectioned className="w-full overflow-hidden" data-e2e="alb-algorithm-card">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={Share2Icon} size={16} className="text-secondary" />
          Load balancing
        </CardTitle>
        {canEdit && !editing ? (
          <CardAction>
            <PermissionButton
              resource="httpproxies"
              verb="patch"
              group="networking.datumapis.com"
              namespace="default"
              scope="project"
              projectId={projectId}
              deniedReason="You don't have permission to edit this Application Load Balancer"
              type="secondary"
              theme="outline"
              size="xs"
              onClick={startEditing}
              data-e2e="alb-algorithm-edit">
              <Icon icon={PencilIcon} size={12} />
              Edit
            </PermissionButton>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent padding="none">
        <CardField>
          <FieldLabel hint="Applies to every route's pool. Backend weights are honoured whichever algorithm is chosen.">
            Algorithm
          </FieldLabel>
          <CardFieldValue>
            {editing ? (
              <Select value={draftType} onValueChange={setDraftType}>
                <SelectTrigger className="w-full" data-e2e="alb-algorithm-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALGORITHMS.map((algorithm) => (
                    <SelectItem key={algorithm.value} value={algorithm.value}>
                      <span className="flex flex-col items-start">
                        <span>{algorithm.label}</span>
                        <span className="text-muted-foreground text-xs">{algorithm.hint}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm">{describe(current)}</span>
            )}
          </CardFieldValue>
        </CardField>

        {/* Revealed inline rather than in a nested dialog, matching how the
            security card reveals its dependent WAF fields. */}
        {editing && draftType === 'ConsistentHash' ? (
          <>
            <CardField>
              <FieldLabel hint="What part of the request is hashed to pick a backend.">
                Hash on
              </FieldLabel>
              <CardFieldValue>
                <Select value={draftHashSource} onValueChange={setDraftHashSource}>
                  <SelectTrigger className="w-full" data-e2e="alb-algorithm-hash-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HASH_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardFieldValue>
            </CardField>

            {draftHashSource === 'Header' ? (
              <CardField>
                <FieldLabel>Header name</FieldLabel>
                <CardFieldValue>
                  <Input
                    value={draftHeader}
                    onChange={(e) => setDraftHeader(e.target.value)}
                    placeholder="e.g. x-user-id"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    data-e2e="alb-algorithm-header"
                  />
                  {headerMissing ? (
                    <p className="text-destructive mt-1 text-xs">
                      A header name is required when hashing on a header.
                    </p>
                  ) : null}
                </CardFieldValue>
              </CardField>
            ) : null}
          </>
        ) : null}
      </CardContent>

      {editing ? (
        <CardSaveBar
          changeCount={changeCount}
          errorCount={headerMissing ? 1 : 0}
          saving={mutation.isPending}
          onCancel={() => setEditing(false)}
          onSave={() => void handleSave()}
        />
      ) : null}
    </Card>
  );
};
