import { isEligibleForProtect } from './utils';
import { IFlattenedDnsRecord } from '@/resources/dns-records';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { EyeIcon, ShieldCheckIcon, ShieldOffIcon } from 'lucide-react';
import { useState } from 'react';

export interface RemoveEdgeCallbacks {
  /** Called when the user confirms in the dialog (before the mutation runs). Used to disable the button only after confirm. */
  onMutationStart?: () => void;
}

export interface DnsRecordAiEdgeCellProps {
  record: IFlattenedDnsRecord;
  zoneDomain: string;

  onProtect: (record: IFlattenedDnsRecord) => Promise<void>;
  onRemove: (record: IFlattenedDnsRecord, callbacks?: RemoveEdgeCallbacks) => Promise<void>;
  onViewProxy: (proxyId: string) => void;
}

/**
 * Renders the AI Edge column cell: Protect / Remove / View button or "DNS only".
 * Buttons are disabled (no loading spinner) while the action is in progress to avoid layout shift.
 */
export function DnsRecordAiEdgeCell({
  record,
  zoneDomain: _zoneDomain,
  onProtect,
  onRemove,
  onViewProxy,
}: DnsRecordAiEdgeCellProps) {
  const [isProtecting, setIsProtecting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const showProtect =
    isEligibleForProtect(record.type) &&
    record.status?.isProgrammed &&
    record.managedByGateway !== true &&
    record.hasProxyForThisRecord !== true;
  const showRemove =
    isEligibleForProtect(record.type) &&
    record.status?.isProgrammed &&
    record.managedByGateway !== true &&
    record.hasProxyForThisRecord === true &&
    record.linkedProxyId;
  const showView = record.managedByGateway === true && record.gatewaySourceName;

  const handleProtect = () => {
    setIsProtecting(true);
    onProtect(record).finally(() => setIsProtecting(false));
  };

  const handleRemove = () => {
    onRemove(record, {
      onMutationStart: () => setIsRemoving(true),
    }).finally(() => setIsRemoving(false));
  };

  if (showProtect) {
    const isIpOrigin = record.type === 'A' || record.type === 'AAAA';
    const protectButton = (
      <Button
        type="secondary"
        theme="outline"
        size="xs"
        className="shrink-0"
        disabled={isProtecting}
        onClick={handleProtect}
        icon={<Icon icon={ShieldCheckIcon} className="text-primary size-3.5 shrink-0" />}
        iconPosition="left">
        Protect with AI Edge
      </Button>
    );
    if (isIpOrigin) {
      return (
        <Tooltip
          message="IP origins use HTTP to your origin (HTTPS to origin not supported for A/AAAA records)."
          side="top">
          {protectButton}
        </Tooltip>
      );
    }
    return protectButton;
  }

  if (showRemove) {
    return (
      <Button
        type="secondary"
        theme="outline"
        size="xs"
        className="shrink-0"
        disabled={isRemoving}
        onClick={handleRemove}
        icon={<Icon icon={ShieldOffIcon} className="size-3.5 shrink-0" />}
        iconPosition="left">
        Remove AI Edge
      </Button>
    );
  }

  if (showView) {
    return (
      <Button
        type="secondary"
        theme="outline"
        size="xs"
        className="shrink-0"
        onClick={() => onViewProxy(record.gatewaySourceName!)}
        icon={<Icon icon={EyeIcon} className="size-3.5 shrink-0" />}
        iconPosition="left">
        View AI Edge
      </Button>
    );
  }

  return <span className="text-muted-foreground text-xs">DNS only</span>;
}
