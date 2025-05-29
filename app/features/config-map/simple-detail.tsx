import { DateFormat } from '@/components/date-format/date-format';
import { Field } from '@/components/field/field';
import { TextCopy } from '@/components/text-copy/text-copy';
import { IConfigMapControlResponse } from '@/resources/interfaces/config-map.interface';
import { getShortId } from '@/utils/misc';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

export const SimpleConfigMapDetail = ({ configMap }: { configMap: IConfigMapControlResponse }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Name">
        <span className="text-muted-foreground text-sm">{configMap?.name}</span>
      </Field>
      {configMap?.uid && (
        <Field label="UUID">
          <TextCopy
            className="text-muted-foreground text-sm"
            value={configMap?.uid}
            text={getShortId(configMap?.uid)}
          />
        </Field>
      )}
      <Field label="Namespace">
        <span className="text-muted-foreground text-sm">{configMap?.namespace}</span>
      </Field>
      {configMap?.createdAt && (
        <Field label="Created At">
          <div className="flex items-center gap-1">
            <DateFormat className="text-muted-foreground text-sm" date={configMap?.createdAt} />
            <span className="text-muted-foreground text-sm">
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
  );
};
