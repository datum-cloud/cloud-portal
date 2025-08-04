import { PrometheusField } from './prometheus/prometheus-field';
import { Field } from '@/components/field/field';
import { MultiSelect } from '@/components/multi-select/multi-select';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { POLICY_SINK_TYPES } from '@/features/observe/constants';
import { ExportPolicySinkType } from '@/resources/interfaces/export-policy.interface';
import {
  ExportPolicySinkFieldSchema,
  ExportPolicySinkPrometheusFieldSchema,
} from '@/resources/schemas/export-policy.schema';
import { getInputProps, getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { isEqual } from 'es-toolkit/compat';
import { useEffect, useRef, useState } from 'react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const SinkField = ({
  fields,
  isEdit = false,
  defaultValue,
  sourceList = [],
  projectId,
}: {
  fields: ReturnType<typeof useForm<ExportPolicySinkFieldSchema>>[1];
  isEdit?: boolean;
  defaultValue?: ExportPolicySinkFieldSchema;
  sourceList: string[];
  projectId?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydrated = useHydrated();

  const nameControl = useInputControl(fields.name);
  const typeControl = useInputControl(fields.type);
  const sourcesControl = useInputControl(fields.sources);

  const [sourcesName, setSourcesName] = useState<string[]>(sourceList);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  useEffect(() => {
    if (defaultValue) {
      // Only set values if they exist in defaultValue and current fields are empty
      if (defaultValue.name && fields.name.value === '') {
        nameControl.change(defaultValue?.name);
      }

      if (defaultValue.type && !fields.type.value) {
        typeControl.change(defaultValue?.type);
      }
    }
  }, [defaultValue, nameControl, fields.name.value, typeControl, fields.type.value]);

  useEffect(() => {
    if (defaultValue?.sources && !fields.sources.value) {
      setSelectedSources(defaultValue?.sources);
      sourcesControl.change(defaultValue?.sources);
    }
  }, [defaultValue]);

  // Focus the input when the form is hydrated
  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  useEffect(() => {
    const isSame = isEqual(sourceList, sourcesName);

    if (!isSame) {
      const filteredSources = selectedSources.filter((source) => sourceList.includes(source));
      setSourcesName(sourceList);
      setSelectedSources(filteredSources);
      sourcesControl.change(filteredSources);
    }
  }, [sourceList]);

  return (
    <div className="relative flex flex-1 flex-col items-start gap-4">
      <Field isRequired label="Name" errors={fields.name.errors} className="w-full">
        <Input
          {...getInputProps(fields.name, { type: 'text' })}
          ref={isEdit ? undefined : inputRef}
          key={fields.name.id}
          placeholder="e.g. my-sink-3sd122"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = (e.target as HTMLInputElement).value;
            nameControl.change(value);
          }}
        />
      </Field>

      <div className="flex w-full gap-4">
        <Field isRequired label="Type" errors={fields.type.errors} className="w-1/2">
          <Select
            {...getSelectProps(fields.type)}
            key={fields.type.id}
            value={typeControl.value}
            defaultValue={defaultValue?.type}
            onValueChange={typeControl.change}>
            <SelectTrigger disabled>
              <SelectValue placeholder="Select a sink type" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(POLICY_SINK_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {POLICY_SINK_TYPES[type as keyof typeof POLICY_SINK_TYPES].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Remove debug output */}
        <Field isRequired label="Sources" errors={fields.sources.errors} className="w-1/2">
          <MultiSelect
            {...getSelectProps(fields.sources, { value: false })}
            name={fields.sources.name}
            placeholder="Select Sources"
            disabled={sourcesName.length === 0}
            defaultValue={selectedSources}
            options={sourcesName.map((source) => ({
              value: source,
              label: source,
            }))}
            onValueChange={(value) => {
              setSelectedSources(value);
              sourcesControl.change(value);
            }}
          />
        </Field>
      </div>

      {typeControl.value === ExportPolicySinkType.PROMETHEUS && (
        <PrometheusField
          projectId={projectId}
          fields={
            fields.prometheusRemoteWrite.getFieldset() as unknown as ReturnType<
              typeof useForm<ExportPolicySinkPrometheusFieldSchema>
            >[1]
          }
          defaultValue={
            defaultValue?.prometheusRemoteWrite as ExportPolicySinkPrometheusFieldSchema
          }
        />
      )}
    </div>
  );
};
