import { useDnsZones } from '../lib/api';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Separator } from '@datum-cloud/datum-ui/separator';
import { useParams } from 'react-router';

/**
 * `portal.card/project-home` extension component, exposed as `SampleHomeCard`.
 *
 * The host renders the card chrome + title ("Sample Plugin") from the manifest;
 * this component supplies the body — styled with host-shared datum-ui.
 *
 * Shows a LIVE DNS zone count, read from the Milo control plane through the
 * portal's authenticated proxy (same `useDnsZones` hook as the platform-data
 * page). The count is strictly additive and degrades gracefully — the
 * description always renders, so a failed fetch never breaks the card.
 */
export default function SampleHomeCard() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: zones, isLoading, isError } = useDnsZones(projectId);

  return (
    <div data-testid="sample-plugin-home-card" className="flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">
        This card is contributed to the project home page by the sample plugin via the{' '}
        <code>portal.card/project-home</code> extension point.
      </p>
      <Separator />
      <p data-testid="sample-plugin-home-card-count" className="flex items-center gap-2">
        <span className="font-medium">DNS zones:</span>
        {isLoading ? (
          <span className="text-muted-foreground">…</span>
        ) : isError ? (
          <Badge type="secondary" theme="light">
            unavailable
          </Badge>
        ) : (
          <Badge type="success" theme="light">
            {zones?.length ?? 0}
          </Badge>
        )}
      </p>
    </div>
  );
}
