import { attentionItems, type AttentionItem } from './home.helpers';
import { useProjectQuotas } from './use-project-quotas';
import { useDnsZones } from '@/resources/dns-zones';
import { useDomains } from '@/resources/domains';
import { useHttpProxies } from '@/resources/http-proxies';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronDown, CircleCheck, CircleX, TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';

const LIST_OPTIONS = { staleTime: QUERY_STALE_TIME, refetchOnMount: false } as const;

function severityIcon(severity: AttentionItem['severity']) {
  return severity === 'error' ? (
    <Icon icon={CircleX} size={16} className="text-destructive shrink-0" aria-hidden />
  ) : (
    <Icon icon={TriangleAlert} size={16} className="shrink-0 text-amber-500" aria-hidden />
  );
}

/**
 * One line that says whether anything in the project needs a person: an
 * unverified domain, a failing DNS zone or load balancer, a quota that's
 * nearly used up. The bar is always drawn at the same height, so it never
 * pushes the page down when the answer arrives; the full list only opens
 * when someone asks for it.
 *
 * It reads the same queries as the columns below, so it costs no extra requests.
 */
export function ProjectHealth({ projectId }: { projectId: string }) {
  const listId = useId();
  const [expanded, setExpanded] = useState(false);

  const domains = useDomains(projectId, LIST_OPTIONS);
  const zones = useDnsZones(projectId, undefined, LIST_OPTIONS);
  const proxies = useHttpProxies(projectId, LIST_OPTIONS);
  const quotas = useProjectQuotas(projectId);

  const isLoading = domains.isLoading || zones.isLoading || proxies.isLoading || quotas.isLoading;

  const items = attentionItems({
    projectId,
    domains: domains.data ?? [],
    zones: zones.data ?? [],
    proxies: proxies.data ?? [],
    quotas: quotas.quotas,
  });
  const [first] = items;
  const hasErrors = items.some((item) => item.severity === 'error');

  return (
    <section
      aria-label="Project health"
      aria-busy={isLoading}
      className="bg-card border-border overflow-hidden rounded-xl border"
      data-testid="project-home-health">
      <div className="flex h-12 items-center gap-3 px-4">
        {isLoading ? (
          <>
            <Skeleton className="size-4 shrink-0 rounded-full" />
            <Skeleton className="h-3 w-48 rounded" />
            <span className="sr-only" role="status">
              Checking project health
            </span>
          </>
        ) : !first ? (
          <>
            <Icon icon={CircleCheck} size={16} className="shrink-0 text-green-600" aria-hidden />
            <Text size="sm" weight="medium">
              Everything looks healthy
            </Text>
            <Text size="sm" textColor="muted" className="hidden truncate @3xl/main:block">
              Domains, DNS, load balancers and quotas are all in good shape.
            </Text>
          </>
        ) : (
          <>
            {severityIcon(hasErrors ? 'error' : 'warning')}
            <Text size="sm" weight="medium" className="shrink-0">
              {items.length === 1 ? '1 thing needs' : `${items.length} things need`} attention
            </Text>
            <Link
              to={first.href}
              className="text-muted-foreground hover:text-foreground hidden min-w-0 truncate text-sm underline-offset-2 hover:underline @xl/main:block">
              {first.label}
            </Link>
            {items.length > 1 && (
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={listId}
                onClick={() => setExpanded((open) => !open)}
                className="text-muted-foreground hover:text-foreground ml-auto flex shrink-0 items-center gap-1 text-xs">
                {expanded ? 'Hide' : 'Show all'}
                <Icon
                  icon={ChevronDown}
                  size={14}
                  aria-hidden
                  className={cn('transition-transform', expanded && 'rotate-180')}
                />
              </button>
            )}
          </>
        )}
      </div>
      {expanded && items.length > 1 && (
        <ul id={listId} className="border-border flex flex-col border-t p-1.5">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                to={item.href}
                className="hover:bg-accent flex h-9 items-center gap-2 rounded-md px-2.5 text-sm transition-colors">
                {severityIcon(item.severity)}
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
