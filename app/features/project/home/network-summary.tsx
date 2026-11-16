import { networkSummary } from './path-choice';
import type { ComDatumapisNetworkingV1AlphaNetwork } from '@/modules/control-plane/networking';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { ChevronRight, Network } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * The project's VPC at a glance, at the end of the status strip: its name and
 * address range when there is one, or a count when there are several. It is
 * labelled "VPC", the word the sidebar uses, so it doesn't read as a bare name. With no
 * network it shows nothing: creating one is the first suggested next step, and
 * offering it here too put the same action on the page twice.
 */
export function NetworkSummary({
  networks,
  networkHref,
  networksHref,
}: {
  networks: ComDatumapisNetworkingV1AlphaNetwork[];
  /** The single network's page, when the Networks plugin is installed. */
  networkHref?: (name: string) => string;
  /** The VPC list, when the Networks plugin is installed. */
  networksHref?: string;
}) {
  const [only] = networks;

  if (networks.length === 0) return null;

  if (networks.length > 1) {
    return (
      <SummaryLink href={networksHref} label="VPCs">
        <Text as="span" size="sm" weight="medium" className="tabular-nums">
          {networks.length}
        </Text>
      </SummaryLink>
    );
  }

  const name = only.metadata?.name ?? '';
  const prefix = only.status?.ipam?.ipv6Prefix;
  return (
    // The address family and MTU are on the VPC's own page; here they'd only
    // crowd the name and the range, so they are the tooltip.
    <Tooltip message={networkSummary(only)}>
      <span className="flex min-w-0">
        <SummaryLink href={networkHref?.(name)} label="VPC">
          <Text as="span" size="sm" weight="medium" className="truncate">
            {name}
          </Text>
          {prefix && (
            <Text
              as="span"
              size="xs"
              textColor="muted"
              className="hidden truncate font-mono @3xl/main:block">
              {prefix}
            </Text>
          )}
        </SummaryLink>
      </span>
    </Tooltip>
  );
}

/**
 * "VPC  default  fd20::/48 ›": a muted label says what the value is, and with
 * somewhere to go the whole thing is one link with a chevron.
 */
function SummaryLink({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: ReactNode;
}) {
  const content = (
    <>
      <Icon icon={Network} size={14} className="text-icon-quaternary shrink-0" aria-hidden />
      <Text as="span" size="xs" textColor="muted" className="shrink-0">
        {label}
      </Text>
      {children}
    </>
  );
  return href ? (
    <Link
      to={href}
      className="group hover:bg-accent -mx-2 flex min-w-0 items-center gap-2 rounded-md px-2 py-1 transition-colors">
      {content}
      <Icon
        icon={ChevronRight}
        size={14}
        className="text-icon-quaternary group-hover:text-foreground shrink-0 transition-colors"
        aria-hidden
      />
    </Link>
  ) : (
    <span className="flex min-w-0 items-center gap-2">{content}</span>
  );
}
