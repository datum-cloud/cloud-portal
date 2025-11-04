import { ExportPolicyStatus } from './status';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { TextCopy } from '@/components/text-copy/text-copy';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getShortId } from '@/utils/helpers/text.helper';
import { Card, CardHeader, CardTitle, CardContent } from '@shadcn/ui/card';
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
            showTooltip={false}
          />
        ),
      },
      {
        label: 'Created At',
        className: 'px-2',
        content: (
          <DateTime className="text-sm" date={exportPolicy?.createdAt ?? ''} variant="both" />
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
