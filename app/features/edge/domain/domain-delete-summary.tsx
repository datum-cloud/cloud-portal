import { paths } from '@/utils/config/paths.config';
import { DOMAIN_IN_USE_BY_DNS_ZONE_MESSAGE } from '@/utils/errors/domain-in-use-error';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import type { TaskSummaryItem } from '@datum-cloud/datum-ui/task-queue';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { CircleCheckIcon, CircleXIcon } from 'lucide-react';
import { useMemo } from 'react';

interface DomainDeleteSummaryProps {
  items: TaskSummaryItem[];
  /** Domain resource name → bound DNS zone resource name, for the items that have one. */
  zoneByDomain: Record<string, string | undefined>;
  projectId: string;
  /** Called with the target path; the caller closes the summary and navigates. */
  onNavigate: (href: string) => void;
}

/**
 * Summary content for the bulk domain delete task.
 *
 * Mirrors the task queue's default Item / Status table, and adds a
 * "View DNS zone" button to rows that failed because a zone still uses the
 * domain, so the operator can jump to the blocker from the summary itself.
 */
export function DomainDeleteSummary({
  items,
  zoneByDomain,
  projectId,
  onNavigate,
}: DomainDeleteSummaryProps) {
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.status === 'failed' && b.status !== 'failed') return -1;
        if (a.status !== 'failed' && b.status === 'failed') return 1;
        return 0;
      }),
    [items]
  );

  const zoneHref = (domainName: string) => {
    const zoneName = zoneByDomain[domainName];
    return zoneName
      ? getPathWithParams(paths.project.detail.dnsZones.detail.root, {
          projectId,
          dnsZoneId: zoneName,
        })
      : getPathWithParams(paths.project.detail.dnsZones.root, { projectId });
  };

  return (
    <div className="max-h-[400px] overflow-auto rounded-xl border">
      <Table>
        <TableHeader className="bg-muted/50 sticky top-0">
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="max-w-80">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item) => {
            const failed = item.status === 'failed';
            const blockedByZone = failed && item.message === DOMAIN_IN_USE_BY_DNS_ZONE_MESSAGE;
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.label}</TableCell>
                <TableCell className="max-w-80 text-wrap break-all whitespace-normal">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <Icon
                        icon={failed ? CircleXIcon : CircleCheckIcon}
                        className={cn('size-4', failed ? 'text-destructive' : 'text-success')}
                      />
                      <Text
                        size="xs"
                        className={cn('font-medium', failed ? 'text-destructive' : 'text-success')}>
                        {failed ? 'Failed' : 'Succeeded'}
                      </Text>
                    </div>
                    {failed && item.message && (
                      <Text size="xs" textColor="muted" className="pl-5.5 text-wrap">
                        {item.message}
                      </Text>
                    )}
                    {blockedByZone && (
                      <div className="pt-1 pl-5.5">
                        <Button
                          type="secondary"
                          theme="outline"
                          size="xs"
                          onClick={() => onNavigate(zoneHref(item.id))}>
                          {zoneByDomain[item.id] ? 'View DNS zone' : 'View DNS zones'}
                        </Button>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
