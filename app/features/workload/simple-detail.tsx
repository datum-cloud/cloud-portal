import { WorkloadStatus } from './status'
import { DateFormat } from '@/components/date-format/date-format'
import { Field } from '@/components/field/field'
import { TextCopy } from '@/components/text-copy/text-copy'
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface'
import { getShortId, transformControlPlaneStatus } from '@/utils/misc'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { useParams } from 'react-router'

export const SimpleWorkloadDetail = ({
  workload,
}: {
  workload: IWorkloadControlResponse
}) => {
  const { projectId } = useParams()
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Name">
        <span className="text-sm text-muted-foreground">{workload?.name}</span>
      </Field>
      {workload?.uid && (
        <Field label="UUID">
          <TextCopy
            className="text-sm text-muted-foreground"
            value={workload?.uid}
            text={getShortId(workload?.uid)}
          />
        </Field>
      )}
      <Field label="Namespace">
        <span className="text-sm text-muted-foreground">{workload?.namespace}</span>
      </Field>
      <Field label="Status">
        <WorkloadStatus
          currentStatus={transformControlPlaneStatus(workload?.status)}
          projectId={projectId}
          workloadId={workload?.name}
          type="badge"
          badgeClassName="w-fit text-sm font-medium border border-input"
        />
      </Field>
      {workload?.createdAt && (
        <Field label="Created At">
          <div className="flex items-center gap-1">
            <DateFormat
              className="text-sm text-muted-foreground"
              date={workload?.createdAt}
            />
            <span className="text-sm text-muted-foreground">
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
  )
}
