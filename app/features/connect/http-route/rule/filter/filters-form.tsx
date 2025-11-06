import { FilterField } from './filter-field';
import { FieldLabel } from '@/components/field/field-label';
import { HTTPFilterType, HTTPPathRewriteType } from '@/resources/interfaces/http-route.interface';
import { HttpRouteFilterSchema, HttpRouteRuleSchema } from '@/resources/schemas/http-route.schema';
import { useForm, useFormMetadata } from '@conform-to/react';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useEffect } from 'react';

export const FilterDefaultValues: HttpRouteFilterSchema = {
  type: HTTPFilterType.URL_REWRITE,
  urlRewrite: {
    hostname: '',
    path: {
      type: HTTPPathRewriteType.REPLACE_PREFIX_MATCH,
      value: '',
    },
  },
};

export const FiltersForm = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<HttpRouteRuleSchema>>[1];
  defaultValue?: HttpRouteFilterSchema[];
}) => {
  const form = useFormMetadata('http-route-form');
  const filterList = fields.filters.getFieldList();

  useEffect(() => {
    if (defaultValue) {
      form.update({
        name: fields.filters.name,
        value: defaultValue,
      });
    }
  }, [defaultValue]);

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel label="Filters" isRequired />

      <div className="space-y-4">
        {filterList.map((filter, index) => {
          const filterFields = filter.getFieldset();
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={filter.key}>
              <FilterField
                fields={
                  filterFields as unknown as ReturnType<typeof useForm<HttpRouteFilterSchema>>[1]
                }
                defaultValue={defaultValue?.[index]}
              />
              {filterList.length > 1 && (
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="small"
                  className={cn(
                    'text-destructive relative w-fit',
                    (filterFields.type.errors ?? []).length > 0 ? '-top-1' : 'top-2.5'
                  )}
                  onClick={() => form.remove({ name: fields.filters.name, index })}>
                  <TrashIcon className="size-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Button
        type="quaternary"
        theme="outline"
        size="small"
        className="ml-1 w-fit"
        onClick={() =>
          form.insert({
            name: fields.filters.name,
            defaultValue: FilterDefaultValues,
          })
        }>
        <PlusIcon className="size-4" />
        Add
      </Button>
    </div>
  );
};
