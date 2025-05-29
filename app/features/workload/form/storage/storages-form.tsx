import { BootField } from './boot-field';
import { StorageField } from './storage-field';
import { List, ListItem } from '@/components/list/list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { STORAGE_TYPES } from '@/constants/options';
import { StorageType } from '@/resources/interfaces/workload.interface';
import {
  StorageFieldSchema,
  StoragesSchema,
  UpdateWorkloadSchema,
} from '@/resources/schemas/workload.schema';
import { cn } from '@/utils/misc';
import { useForm, useFormMetadata } from '@conform-to/react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';

export const StoragesForm = ({
  fields,
  defaultValue,
  isEdit = false,
  vmBootImage,
}: {
  fields: ReturnType<typeof useForm<UpdateWorkloadSchema>>[1];
  defaultValue?: StoragesSchema;
  isEdit?: boolean;
  vmBootImage?: string;
}) => {
  const form = useFormMetadata('workload-form');
  const storages = fields.storages.getFieldList();
  const virtualMachineFieldSet = fields.virtualMachine.getFieldset();

  const values = useMemo(() => {
    return defaultValue?.storages
      ? defaultValue.storages
      : ((defaultValue ?? []) as StorageFieldSchema[]);
  }, [defaultValue]);

  const bootImage = useMemo(() => {
    if (vmBootImage) {
      return vmBootImage;
    }
    return virtualMachineFieldSet.bootImage?.value;
  }, [virtualMachineFieldSet.bootImage?.value, vmBootImage]);

  useEffect(() => {
    form.update({
      name: fields.storages.name,
      value: values as StorageFieldSchema[],
    });
  }, [values]);

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-4">
        {bootImage !== undefined && (
          <div className="relative flex items-center gap-2 rounded-md border p-4">
            <BootField defaultValue={{ name: 'boot', bootImage: bootImage ?? '' }} />
          </div>
        )}
        {storages.map((storage, index) => {
          const storageFields = storage.getFieldset();
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={storage.key}>
              <StorageField
                isEdit={isEdit}
                fields={
                  storageFields as unknown as ReturnType<typeof useForm<StorageFieldSchema>>[1]
                }
                defaultValue={values?.[index] as StorageFieldSchema}
              />

              {storages.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'text-destructive relative w-fit',
                    (storageFields.name.errors ?? []).length > 0 ||
                      (storageFields.type.errors ?? []).length > 0
                      ? 'top-2'
                      : 'top-2'
                  )}
                  onClick={() => form.remove({ name: fields.storages.name, index })}>
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
        className="w-fit"
        onClick={() =>
          form.insert({
            name: fields.storages.name,
            defaultValue: { name: '', type: StorageType.FILESYSTEM },
          })
        }>
        <PlusIcon className="size-4" />
        Add Storage
      </Button>
    </div>
  );
};

export const StoragesPreview = ({
  values,
  vmBootImage,
}: {
  values: StoragesSchema;
  vmBootImage?: string;
}) => {
  const bootValues = useMemo(() => {
    if (vmBootImage) {
      return {
        name: 'boot',
        bootImage: vmBootImage,
      };
    }

    return undefined;
  }, [vmBootImage]);

  const listItems: ListItem[] = useMemo(() => {
    let bootDetail = {};
    if (bootValues) {
      bootDetail = {
        label: bootValues.name,
        content: (
          <div className="flex items-center gap-2 font-medium">
            <span>{bootValues.bootImage}</span>
          </div>
        ),
      };
    }

    const storages = (values.storages ?? [])
      .filter((storage) => storage.name !== '')
      .map((storage) => ({
        label: storage.name,
        content: (
          <div className="flex items-center gap-2 font-medium">
            <Badge variant="outline">Size: {storage.size}Gi</Badge>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="outline">
              {STORAGE_TYPES[storage.type as keyof typeof STORAGE_TYPES].label}
            </Badge>
          </div>
        ),
      }));

    return [bootDetail, ...storages];
  }, [values, bootValues]);

  return <List items={listItems} itemClassName="!border-b-0 !px-0 py-1.5" />;
};
