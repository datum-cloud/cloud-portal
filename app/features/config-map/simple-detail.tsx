import { DateTime } from '@/components/date-time';
import { Field } from '@/components/field/field';
import { IConfigMapControlResponse } from '@/resources/interfaces/config-map.interface';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

export const SimpleConfigMapDetail = ({ configMap }: { configMap: IConfigMapControlResponse }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Name">
        <span className="text-muted-foreground text-sm">{configMap?.name}</span>
      </Field>
      <Field label="Namespace">
        <span className="text-muted-foreground text-sm">{configMap?.namespace}</span>
      </Field>
      {configMap?.createdAt && (
        <Field label="Created At">
          <div className="flex items-center gap-1">
            <DateTime className="text-muted-foreground text-sm" date={configMap?.createdAt} />
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
