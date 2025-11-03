import { ListenerField } from './listener-field';
import { FieldLabel } from '@/components/field/field-label';
import {
  GatewayAllowedRoutes,
  GatewayProtocol,
  GatewayTlsMode,
} from '@/resources/interfaces/gateway.interface';
import {
  GatewayListenerFieldSchema,
  GatewayListenerSchema,
} from '@/resources/schemas/gateway.schema';
import { useForm, useFormMetadata } from '@conform-to/react';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';

const defaultListenerValue: GatewayListenerFieldSchema = {
  name: '',
  protocol: GatewayProtocol.HTTP,
  allowedRoutes: GatewayAllowedRoutes.SAME,
  tlsConfiguration: {
    mode: GatewayTlsMode.TERMINATE,
  },
};

export const ListenersForm = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<GatewayListenerSchema>>[1];
  defaultValue?: GatewayListenerSchema;
}) => {
  const form = useFormMetadata('gateway-form');
  const listenerList = fields.listeners.getFieldList();

  const values = useMemo(() => {
    return defaultValue?.listeners
      ? defaultValue.listeners
      : ((defaultValue ?? []) as GatewayListenerFieldSchema[]);
  }, [defaultValue]);

  useEffect(() => {
    if (values && values.length > 0) {
      form.update({
        name: fields.listeners.name,
        value: values as GatewayListenerFieldSchema[],
      });
    } else if (listenerList.length === 0) {
      form.insert({
        name: fields.listeners.name,
        defaultValue: defaultListenerValue,
      });
    }
  }, [values]);

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel label="Listeners" />

      <div className="space-y-4">
        {listenerList.map((field, index) => {
          const listenerFields = field.getFieldset();
          return (
            <div className="relative flex items-center gap-2 rounded-md border p-4" key={field.key}>
              <ListenerField
                fields={
                  listenerFields as unknown as ReturnType<
                    typeof useForm<GatewayListenerFieldSchema>
                  >[1]
                }
                defaultValue={values?.[index]}
              />

              {listenerList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn('text-destructive relative top-2 w-fit')}
                  onClick={() => form.remove({ name: fields.listeners.name, index })}>
                  <TrashIcon className="size-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-1 w-fit"
        onClick={() =>
          form.insert({
            name: fields.listeners.name,
            defaultValue: defaultListenerValue,
          })
        }>
        <PlusIcon className="size-4" />
        Add
      </Button>
    </div>
  );
};
