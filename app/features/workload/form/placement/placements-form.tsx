import { PlacementField } from './placement-field';
import { List, ListItem } from '@/components/list/list';
import { ILocationControlResponse } from '@/resources/interfaces/location.interface';
import { PlacementFieldSchema, PlacementsSchema } from '@/resources/schemas/workload.schema';
import { ROUTE_PATH as LOCATION_LIST_ROUTE_PATH } from '@/routes/api/locations';
import { useForm, useFormMetadata } from '@conform-to/react';
import { Badge } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Separator } from '@shadcn/ui/separator';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFetcher } from 'react-router';

export const PlacementsForm = ({
  fields,
  defaultValue,
  isEdit = false,
  projectId,
}: {
  fields: ReturnType<typeof useForm<PlacementsSchema>>[1];
  defaultValue?: PlacementsSchema;
  isEdit?: boolean;
  projectId?: string;
}) => {
  const fetcher = useFetcher({ key: 'location-resources' });
  const form = useFormMetadata('workload-form');
  const placements = fields.placements.getFieldList();
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  const values = useMemo(() => {
    return defaultValue?.placements
      ? defaultValue.placements
      : ((defaultValue ?? []) as PlacementFieldSchema[]);
  }, [defaultValue]);

  useEffect(() => {
    if (values) {
      form.update({
        name: fields.placements.name,
        value: values as PlacementFieldSchema[],
      });
    }
  }, [values]);

  useEffect(() => {
    if (projectId) {
      fetcher.load(`${LOCATION_LIST_ROUTE_PATH}?projectId=${projectId}`);
    }
  }, [projectId]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const cities = ((fetcher.data ?? []) as ILocationControlResponse[]).map(
        (location) => location.cityCode
      );
      setAvailableLocations(cities as string[]);
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-4">
        {placements.map((placement, index) => {
          const placementFields = placement.getFieldset();
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={placement.key}>
              <PlacementField
                availableLocations={availableLocations}
                isEdit={isEdit}
                fields={
                  placementFields as unknown as ReturnType<typeof useForm<PlacementFieldSchema>>[1]
                }
                defaultValue={values?.[index] as PlacementFieldSchema}
              />

              {placements.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'text-destructive relative w-fit',
                    (placementFields.name.errors ?? []).length > 0 ? 'top-2' : 'top-5.5'
                  )}
                  onClick={() => form.remove({ name: fields.placements.name, index })}>
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
            name: fields.placements.name,
            defaultValue: { name: undefined, cityCode: undefined, minimumReplicas: 1 },
          })
        }>
        <PlusIcon className="size-4" />
        Add Placement
      </Button>
    </div>
  );
};

export const PlacementsPreview = ({ values }: { values: PlacementsSchema }) => {
  const listItems: ListItem[] = useMemo(() => {
    if ((values.placements ?? []).length > 0) {
      return values.placements.map((placement) => ({
        label: placement.name,
        content: (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{placement.cityCode}</Badge>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="outline">Min Replicas: {placement.minimumReplicas}</Badge>
          </div>
        ),
      }));
    }

    return [];
  }, [values]);

  return <List items={listItems} itemClassName="!border-b-0 !px-0 py-1.5" />;
};
