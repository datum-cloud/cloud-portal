import { networkSummary } from './path-choice';
import type { ComDatumapisNetworkingV1AlphaNetwork } from '@/modules/control-plane/networking';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Network } from 'lucide-react';
import { Link } from 'react-router';

/**
 * The project's network at a glance, beside the health line: its address range
 * when there is one network, a count when there are several, and a way to
 * create one when there is none.
 */
export function NetworkSummary({
  networks,
  networkHref,
  networksHref,
  onCreateNetwork,
}: {
  networks: ComDatumapisNetworkingV1AlphaNetwork[];
  /** The single network's page, when the Networks plugin is installed. */
  networkHref?: (name: string) => string;
  /** The VPC list, when the Networks plugin is installed. */
  networksHref?: string;
  onCreateNetwork: () => void;
}) {
  const [only] = networks;

  if (networks.length === 0) {
    return (
      <span className="flex shrink-0 items-center gap-2">
        <Icon icon={Network} size={14} className="text-icon-quaternary" aria-hidden />
        <Text size="xs" textColor="muted">
          No network
        </Text>
        <Button
          type="quaternary"
          theme="borderless"
          size="xs"
          className="text-btn-primary"
          onClick={onCreateNetwork}>
          Create network
        </Button>
      </span>
    );
  }

  if (networks.length > 1) {
    const label = `${networks.length} networks`;
    return (
      <span className="flex shrink-0 items-center gap-2">
        <Icon icon={Network} size={14} className="text-icon-quaternary" aria-hidden />
        {networksHref ? (
          <Link to={networksHref} className="text-sm font-medium hover:underline">
            {label}
          </Link>
        ) : (
          <Text size="sm" weight="medium">
            {label}
          </Text>
        )}
      </span>
    );
  }

  const name = only.metadata?.name ?? '';
  return (
    <span className="flex min-w-0 shrink-0 items-center gap-2">
      <Icon icon={Network} size={14} className="text-icon-quaternary" aria-hidden />
      {networkHref ? (
        <Link to={networkHref(name)} className="text-sm font-medium hover:underline">
          {name}
        </Link>
      ) : (
        <Text size="sm" weight="medium">
          {name}
        </Text>
      )}
      <Text size="xs" textColor="muted" className="hidden truncate font-mono @3xl/main:block">
        {networkSummary(only)}
      </Text>
    </span>
  );
}
