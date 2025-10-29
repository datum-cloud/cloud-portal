import { WorkloadStatus } from './status';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { TextCopy } from '@/components/text-copy/text-copy';
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getShortId } from '@/utils/helpers/text.helper';
import { Card, CardHeader, CardTitle, CardContent } from '@shadcn/ui/card';
import { useMemo } from 'react';

export const WorkloadGeneralCard = ({ workload }: { workload: IWorkloadControlResponse }) => {
  const listItems: ListItem[] = useMemo(() => {
    if (!workload) return [];

    return [
      {
        label: 'Name',
        className: 'px-2',
        content: <TextCopy className="text-sm" value={workload.name ?? ''} text={workload.name} />,
      },
      {
        label: 'UID',
        className: 'px-2',
        content: (
          <TextCopy
            className="text-sm"
            value={workload.uid ?? ''}
            text={getShortId(workload.uid ?? '')}
          />
        ),
      },
      {
        label: 'Namespace',
        className: 'px-2',
        content: <span>{workload.namespace}</span>,
      },
      {
        label: 'Status',
        className: 'px-2',
        content: (
          <WorkloadStatus
            currentStatus={transformControlPlaneStatus(workload?.status)}
            workloadType="workload"
            type="badge"
            badgeClassName="w-fit text-sm font-medium px-0"
          />
        ),
      },
      {
        label: 'Created At',
        className: 'px-2',
        content: <DateTime className="text-sm" date={workload?.createdAt ?? ''} variant="both" />,
      },
    ];
  }, [workload]);
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
