import { ExportPolicyStatus } from './status';
import { DateFormat } from '@/components/date-format/date-format';
import { List, ListItem } from '@/components/list/list';
import { TextCopy } from '@/components/text-copy/text-copy';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { getShortId } from '@/utils/text';
import { formatDistanceToNow } from 'date-fns';
import { useMemo } from 'react';

export const ExportPolicyGeneralCard = ({
  exportPolicy,
}: {
  exportPolicy: IExportPolicyControlResponse;
}) => {
  const listItems: ListItem[] = useMemo(() => {
    if (!exportPolicy) return [];

    return [
      {
        label: 'Name',
        className: 'px-2',
        content: (
          <TextCopy className="text-sm" value={exportPolicy.name ?? ''} text={exportPolicy.name} />
        ),
      },
      {
        label: 'UID',
        className: 'px-2',
        content: (
          <TextCopy
            className="text-sm"
            value={exportPolicy.uid ?? ''}
            text={getShortId(exportPolicy.uid ?? '')}
          />
        ),
      },
      {
        label: 'Namespace',
        className: 'px-2',
        content: <span className="capitalize">{exportPolicy.namespace}</span>,
      },
      {
        label: 'Status',
        className: 'px-2',
        content: (
          <ExportPolicyStatus
            currentStatus={transformControlPlaneStatus(exportPolicy?.status)}
            type="badge"
            badgeClassName="w-fit text-sm font-medium px-0"
            showTooltip={false}
          />
        ),
      },
      {
        label: 'Created At',
        className: 'px-2',
        content: (
          <div className="flex items-center gap-1">
            <DateFormat className="text-sm" date={exportPolicy?.createdAt ?? ''} />
            <span className="text-sm">
              (
              {formatDistanceToNow(new Date(exportPolicy?.createdAt ?? ''), {
                addSuffix: true,
              })}
              )
            </span>
          </div>
        ),
      },
    ];
  }, [exportPolicy]);

  return (
    <Card className="w-full">
      <CardHeader className="px-6">
        <CardTitle className="text-base leading-none font-medium">General</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-2">
        <List items={listItems} />
      </CardContent>
    </Card>
  );
};
