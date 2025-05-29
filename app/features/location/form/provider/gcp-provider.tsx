import { Field } from '@/components/field/field';
import { FieldLabel } from '@/components/field/field-label';
import { SelectBox, SelectBoxOption } from '@/components/select-box/select-box';
import { Input } from '@/components/ui/input';
import GCP_REGIONS from '@/constants/json/gcp-region.json';
import { LocationProvider } from '@/resources/interfaces/location.interface';
import { FieldMetadata, getInputProps, getSelectProps, useInputControl } from '@conform-to/react';
import { Slash } from 'lucide-react';
import { useMemo } from 'react';

export const GCPProvider = ({
  isEdit = false,
  meta,
}: {
  isEdit?: boolean;
  meta: {
    provider: FieldMetadata<LocationProvider>;
    projectId: FieldMetadata<string>;
    region: FieldMetadata<string>;
    zone: FieldMetadata<string>;
  };
}) => {
  const regionControl = useInputControl(meta.region);
  const zoneControl = useInputControl(meta.zone);

  const zoneOptions = useMemo(() => {
    if (!meta.region.value) return [];

    const list = GCP_REGIONS.find((option) => option.name === meta.region.value)?.zones;
    return list?.map((zone) => ({
      value: zone,
      label: zone,
    }));
  }, [meta.region.value]);

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel label="Google Cloud Platform Configuration" />
      <div className="space-y-4">
        <Input
          hidden
          {...getInputProps(meta.provider, { type: 'text' })}
          key={meta.provider.id}
          placeholder="e.g. GCP"
          className="hidden"
        />
        <Field isRequired label="Project ID" errors={meta.projectId.errors}>
          <Input
            {...getInputProps(meta.projectId, { type: 'text' })}
            key={meta.projectId.id}
            placeholder="e.g. my-project-343j33"
            readOnly={isEdit}
          />
        </Field>
        <div className="flex w-full gap-4">
          <Field isRequired label="Region" errors={meta.region.errors} className="w-1/2">
            <SelectBox
              {...getSelectProps(meta.region, { value: false })}
              options={GCP_REGIONS.map((region) => ({
                value: region.name,
                label: `${region.name} - ${region.location}`,
                ...region,
              }))}
              itemPreview={(option) => (
                <div className="flex w-full items-center gap-0.5">
                  <span className="font-medium">{option.name}</span>
                  <Slash className="text-muted-foreground! mx-0.5 size-2!" />
                  <span className="text-muted-foreground text-xs">{option.location}</span>
                </div>
              )}
              onChange={(value: SelectBoxOption) => {
                regionControl.change(value.value);
                zoneControl.change(undefined);
              }}
              value={meta.region.value}
              placeholder="Select a region"
              disabled={isEdit}
              searchable
            />
          </Field>
          <Field isRequired label="Zone" errors={meta.zone.errors} className="w-1/2">
            <SelectBox
              {...getSelectProps(meta.zone, { value: false })}
              options={zoneOptions ?? []}
              onChange={(value: SelectBoxOption) => {
                zoneControl.change(value.value);
              }}
              value={meta.zone.value}
              placeholder="Select a zone"
              disabled={isEdit}
            />
          </Field>
        </div>
      </div>
    </div>
  );
};
