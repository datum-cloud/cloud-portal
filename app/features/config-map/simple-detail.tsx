import { DateFormat } from '@/components/date-format/date-format'
import { Field } from '@/components/field/field'
import { TextCopy } from '@/components/text-copy/text-copy'
import { IConfigMapControlResponse } from '@/resources/interfaces/config-maps.interface'
import { getShortId } from '@/utils/misc'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'

export const SimpleConfigMapDetail = ({
  configMap,
}: {
  configMap: IConfigMapControlResponse
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Name">
        <span className="text-sm text-muted-foreground">{configMap?.name}</span>
      </Field>
      {configMap?.uid && (
        <Field label="UUID">
          <TextCopy
            className="text-sm text-muted-foreground"
            value={configMap?.uid}
            text={getShortId(configMap?.uid)}
          />
        </Field>
      )}
      <Field label="Namespace">
        <span className="text-sm text-muted-foreground">{configMap?.namespace}</span>
      </Field>
      {configMap?.createdAt && (
        <Field label="Created At">
          <div className="flex items-center gap-1">
            <DateFormat
              className="text-sm text-muted-foreground"
              date={configMap?.createdAt}
            />
            <span className="text-sm text-muted-foreground">
              (
              {formatDistanceToNow(new Date(configMap?.createdAt), {
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
