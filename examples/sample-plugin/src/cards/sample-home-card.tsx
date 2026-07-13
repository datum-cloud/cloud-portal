import { PLUGIN_ID } from '../lib/api';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Separator } from '@datum-cloud/datum-ui/separator';
import { useQuery } from '@tanstack/react-query';

/**
 * `portal.card/project-home` extension component, exposed as `SampleHomeCard`.
 *
 * The host renders the card chrome + title ("Sample Plugin") from the manifest;
 * this component supplies the body — styled with host-shared datum-ui.
 *
 * Shows a LIVE instance count via TanStack Query (host singleton). The count is
 * strictly additive and degrades gracefully — the description always renders,
 * so a missing backend never breaks the card.
 */
function useInstanceCount() {
  return useQuery({
    queryKey: [PLUGIN_ID, 'instances', 'count'],
    queryFn: async () => {
      const res = await fetch('/api/plugins/sample/proxy/api/instances', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { data: { items: unknown[] } };
      return body.data.items.length;
    },
    retry: false,
  });
}

export default function SampleHomeCard() {
  const { data: count, isLoading, isError } = useInstanceCount();

  return (
    <div data-testid="sample-plugin-home-card" className="flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">
        This card is contributed to the project home page by the sample plugin via the{' '}
        <code>portal.card/project-home</code> extension point.
      </p>
      <Separator />
      <p data-testid="sample-plugin-home-card-count" className="flex items-center gap-2">
        <span className="font-medium">Instances:</span>
        {isLoading ? (
          <span className="text-muted-foreground">…</span>
        ) : isError ? (
          <Badge type="secondary" theme="light">
            unavailable
          </Badge>
        ) : (
          <Badge type="success" theme="light">
            {count}
          </Badge>
        )}
      </p>
    </div>
  );
}
