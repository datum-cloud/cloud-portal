import { ExportPolicyStatus } from './status'
import { DateFormat } from '@/components/date-format/date-format'
import { Field } from '@/components/field/field'
import { TextCopy } from '@/components/text-copy/text-copy'
import { IExportPolicyControlResponse } from '@/resources/interfaces/policy.interface'
import { getShortId, transformControlPlaneStatus } from '@/utils/misc'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'

export const SimpleExportPolicyDetail = ({
  projectId,
  exportPolicy,
}: {
  projectId?: string
  exportPolicy: IExportPolicyControlResponse
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Name">
        <span className="text-muted-foreground text-sm">{exportPolicy?.name}</span>
      </Field>
      {exportPolicy?.uid && (
        <Field label="UUID">
          <TextCopy
            className="text-muted-foreground text-sm"
            value={exportPolicy?.uid}
            text={getShortId(exportPolicy?.uid)}
          />
        </Field>
      )}
      <Field label="Namespace">
        <span className="text-muted-foreground text-sm">{exportPolicy?.namespace}</span>
      </Field>
      <Field label="Status">
        <ExportPolicyStatus
          currentStatus={transformControlPlaneStatus(exportPolicy?.status)}
          projectId={projectId}
          id={exportPolicy?.name}
          type="badge"
          badgeClassName="w-fit text-sm font-medium border border-input"
        />
      </Field>
      {exportPolicy?.createdAt && (
        <Field label="Created At">
          <div className="flex items-center gap-1">
            <DateFormat
              className="text-muted-foreground text-sm"
              date={exportPolicy?.createdAt}
            />
            <span className="text-muted-foreground text-sm">
              (
              {formatDistanceToNow(new Date(exportPolicy?.createdAt), {
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
