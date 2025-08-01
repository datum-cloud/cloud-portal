import { WorkloadStatus } from './status';
import { DateFormat } from '@/components/common/date-format';
import { TextCopy } from '@/components/common/text-copy/text-copy';
import { Field } from '@/components/forms/field/field';
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface';
import { transformControlPlaneStatus } from '@/utils/misc';
import { formatDistanceToNow } from 'date-fns';

export const SimpleWorkloadDetail = ({
  projectId,
  workload,
}: {
  projectId?: string;
  workload: IWorkloadControlResponse;
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Name">
        <TextCopy
          className="text-muted-foreground text-sm"
          value={workload?.name ?? ''}
          text={workload?.name ?? ''}
        />
      </Field>
      <Field label="Namespace">
        <span className="text-muted-foreground text-sm">{workload?.namespace}</span>
      </Field>
      <Field label="Status">
        <WorkloadStatus
          currentStatus={transformControlPlaneStatus(workload?.status)}
          projectId={projectId}
          id={workload?.name}
          workloadType="workload"
          type="badge"
          badgeClassName="w-fit text-sm font-medium border border-input"
        />
      </Field>
      {workload?.createdAt && (
        <Field label="Created At">
          <div className="flex items-center gap-1">
            <DateFormat className="text-muted-foreground text-sm" date={workload?.createdAt} />
            <span className="text-muted-foreground text-sm">
              (
              {formatDistanceToNow(new Date(workload?.createdAt), {
                addSuffix: true,
              })}
              )
            </span>
          </div>
        </Field>
      )}
    </div>
  );
};
