import type { UsageMeter } from '../usage.types';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';

export interface IdleMeterGroup {
  id: string;
  /** Shown as a group header row; omit for a single group under its own section. */
  title?: string;
  meters: UsageMeter[];
}

/**
 * Compact list of meters with no usage in the period: one row each with its
 * name and description, instead of a full chart card per meter. Styled after
 * the usage summary table so the two read as one system.
 */
export function IdleMeterList({
  groups,
  className,
}: {
  groups: IdleMeterGroup[];
  className?: string;
}) {
  return (
    <Card size="sm" sectioned className={cn('min-w-0 overflow-hidden', className)}>
      <CardContent padding="none">
        {groups.map((group) => (
          <div key={group.id} className="border-border border-b last:border-b-0">
            {group.title ? (
              <div className="bg-muted/40 border-border flex h-10 items-center border-b px-4 sm:px-5">
                <Text size="xs" weight="medium" textColor="default">
                  {group.title}
                </Text>
              </div>
            ) : null}
            <ul className="divide-border divide-y">
              {group.meters.map((meter) => (
                <li
                  key={meter.id}
                  className="flex min-w-0 items-center justify-between gap-4 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <Text as="p" textColor="default" ellipsis className="block">
                      {meter.label}
                    </Text>
                    {meter.description ? (
                      <Text as="p" size="xs" textColor="muted" ellipsis className="block">
                        {meter.description}
                      </Text>
                    ) : null}
                  </div>
                  <Text size="xs" textColor="muted" className="shrink-0">
                    No usage
                  </Text>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
