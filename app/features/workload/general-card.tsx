import { WorkloadStatus } from './status';
import { DateFormat } from '@/components/common/date-format';
import { List, ListItem } from '@/components/common/list';
import { TextCopy } from '@/components/common/text-copy/text-copy';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface';
import { getShortId, transformControlPlaneStatus } from '@/utils/misc';
import { formatDistanceToNow } from 'date-fns';
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
        content: <span className="capitalize">{workload.namespace}</span>,
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
        content: (
          <div className="flex items-center gap-1">
            <DateFormat className="text-sm" date={workload?.createdAt ?? ''} />
            <span className="text-sm">
              (
              {formatDistanceToNow(new Date(workload?.createdAt ?? ''), {
                addSuffix: true,
              })}
              )
            </span>
          </div>
        ),
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
