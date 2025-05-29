import { Field } from '@/components/field/field';
import { MultiSelect } from '@/components/multi-select/multi-select';
import { Option } from '@/components/select-autocomplete/select-autocomplete.types';
import { SelectNetwork } from '@/components/select-network/select-network';
import { NetworkFieldSchema } from '@/resources/schemas/workload.schema';
import { getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { useEffect, useState } from 'react';

export const NetworkFieldForm = ({
  projectId,
  fields,
  defaultValue,
  networkOptions = [],
  exceptItems,
}: {
  projectId?: string;
  fields: ReturnType<typeof useForm<NetworkFieldSchema>>[1];
  defaultValue?: NetworkFieldSchema;
  networkOptions?: Option[];
  exceptItems: string[];
}) => {
  const [ipFamilies, setIpFamilies] = useState<string[]>([]);
  const [selectedIpFamilies, setSelectedIpFamilies] = useState<string[]>([]);

  const networkNameControl = useInputControl(fields.name);
  const ipFamiliesControl = useInputControl(fields.ipFamilies);

  const onChangeNetwork = (value: Option) => {
    // Check if the current value different with the default value
    let selected: string[] = [];
    if (value.value === networkNameControl.value) {
      selected = value?.ipFamilies || [];
    }

    setSelectedIpFamilies(selected);
    ipFamiliesControl.change(selected);
    networkNameControl.change(value.value);

    setIpFamilies(value.ipFamilies);
  };

  useEffect(() => {
    if (defaultValue) {
      // Only set values if they exist in defaultValue and current fields are empty
      if (defaultValue.name && fields.name.value === '') {
        networkNameControl.change(defaultValue?.name ?? '');
      }

      if (defaultValue.ipFamilies && !fields.ipFamilies.value) {
        ipFamiliesControl.change(defaultValue.ipFamilies ?? []);
      }
    }
  }, [
    defaultValue,
    networkNameControl,
    ipFamiliesControl,
    fields.name.value,
    fields.ipFamilies.value,
  ]);

  return (
    <div className="relative flex w-full items-start gap-4">
      <Field isRequired label="Network" errors={fields.name.errors} className="w-1/2">
        <SelectNetwork
          name={fields.name.name}
          id={fields.name.id}
          defaultValue={fields.name.value}
          projectId={projectId}
          onValueChange={onChangeNetwork}
          defaultOptions={networkOptions}
          exceptItems={exceptItems}
        />
      </Field>
      <Field isRequired label="IP Families" errors={fields.ipFamilies.errors} className="w-1/2">
        <MultiSelect
          {...getSelectProps(fields.ipFamilies)}
          key={fields.ipFamilies.id}
          placeholder="Select IP Families"
          disabled={ipFamilies.length === 0 || !fields.name.value}
          defaultValue={selectedIpFamilies}
          options={ipFamilies.map((ipFamily) => ({
            label: ipFamily,
            value: ipFamily,
          }))}
          onValueChange={(value) => {
            ipFamiliesControl.change(value);
          }}
        />
      </Field>
    </div>
  );
};
