import { WorkloadStatus } from './status';
import { DateTime } from '@/components/date-time';
import { Field } from '@/components/field/field';
import { TextCopy } from '@/components/text-copy/text-copy';
import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface';

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
          <DateTime
            className="text-muted-foreground text-sm"
            date={workload?.createdAt}
            variant="both"
          />
        </Field>
      )}
    </div>
  );
};
