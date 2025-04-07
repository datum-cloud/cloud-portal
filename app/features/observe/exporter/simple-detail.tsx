import { ExporterStatus } from './status'
import { DateFormat } from '@/components/date-format/date-format'
import { Field } from '@/components/field/field'
import { TextCopy } from '@/components/text-copy/text-copy'
import { IExportPolicyControlResponse } from '@/resources/interfaces/policy.interface'
import { getShortId, transformControlPlaneStatus } from '@/utils/misc'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'

export const SimpleExporterDetail = ({
  projectId,
  exporter,
}: {
  projectId?: string
  exporter: IExportPolicyControlResponse
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Name">
        <span className="text-muted-foreground text-sm">{exporter?.name}</span>
      </Field>
      {exporter?.uid && (
        <Field label="UUID">
          <TextCopy
            className="text-muted-foreground text-sm"
            value={exporter?.uid}
            text={getShortId(exporter?.uid)}
          />
        </Field>
      )}
      <Field label="Namespace">
        <span className="text-muted-foreground text-sm">{exporter?.namespace}</span>
      </Field>
      <Field label="Status">
        <ExporterStatus
          currentStatus={transformControlPlaneStatus(exporter?.status)}
          projectId={projectId}
          id={exporter?.name}
          type="badge"
          badgeClassName="w-fit text-sm font-medium border border-input"
        />
      </Field>
      {exporter?.createdAt && (
        <Field label="Created At">
          <div className="flex items-center gap-1">
            <DateFormat
              className="text-muted-foreground text-sm"
              date={exporter?.createdAt}
            />
            <span className="text-muted-foreground text-sm">
              (
              {formatDistanceToNow(new Date(exporter?.createdAt), {
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
