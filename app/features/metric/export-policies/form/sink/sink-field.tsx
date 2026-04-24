import { PrometheusField } from './prometheus/prometheus-field';
import { MultiSelect } from '@/components/multi-select/multi-select';
import { POLICY_SINK_TYPES } from '@/features/metric/constants';
import { ExportPolicySinkTypeEnum } from '@/resources/export-policies';
import { toStringArray } from '@/utils/helpers/form-value.helper';
import { Form } from '@datum-cloud/datum-ui/form';
import type { FormFieldRenderProps } from '@datum-cloud/datum-ui/form';
import { isEqual } from 'es-toolkit/compat';
import { useState, useEffect, useRef } from 'react';

/** Extracted component so hooks are valid inside Form.Field render */
const SourcesMultiSelect = ({
  control,
  meta,
  sourceList,
}: Pick<FormFieldRenderProps, 'control' | 'meta'> & { sourceList: string[] }) => {
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const prevSourceListRef = useRef(sourceList);

  // Sync selected sources when sourceList changes (source was renamed/removed)
  useEffect(() => {
    if (!isEqual(sourceList, prevSourceListRef.current)) {
      prevSourceListRef.current = sourceList;
      const filtered = selectedSources.filter((s) => sourceList.includes(s));
      setSelectedSources(filtered);
      control.change(filtered);
    }
  }, [sourceList]);

  // Initialize from form value (adapter may serialize arrays as JSON strings)
  useEffect(() => {
    const arr = toStringArray(control.value);
    if (arr.length > 0 && selectedSources.length === 0) {
      setSelectedSources(arr);
    }
  }, [control.value]);

  return (
    <MultiSelect
      name={meta.name}
      placeholder="Select Sources"
      disabled={sourceList.length === 0}
      defaultValue={selectedSources}
      options={sourceList.map((source) => ({
        value: source,
        label: source,
      }))}
      onValueChange={(value) => {
        setSelectedSources(value);
        control.change(value);
      }}
    />
  );
};

export const SinkField = ({
  index,
  isEdit = false,
  sourceList = [],
  projectId,
}: {
  index: number;
  isEdit?: boolean;
  sourceList: string[];
  projectId?: string;
}) => {
  const baseName = `sinks.${index}`;

  return (
    <div className="relative flex flex-1 flex-col items-start gap-4">
      <Form.Field name={`${baseName}.name`} label="Name" required className="w-full">
        <Form.Input placeholder="e.g. my-sink-3sd122" readOnly={isEdit} autoFocus={!isEdit} />
      </Form.Field>

      <div className="flex w-full flex-col gap-4 sm:flex-row">
        <Form.Field name={`${baseName}.type`} label="Type" required className="w-full sm:w-1/2">
          <Form.Select disabled>
            {Object.keys(POLICY_SINK_TYPES).map((type) => (
              <Form.SelectItem key={type} value={type}>
                {POLICY_SINK_TYPES[type as keyof typeof POLICY_SINK_TYPES].label}
              </Form.SelectItem>
            ))}
          </Form.Select>
        </Form.Field>

        <Form.Field
          name={`${baseName}.sources`}
          label="Sources"
          required
          className="w-full sm:w-1/2">
          {({ control, meta }) => (
            <SourcesMultiSelect control={control} meta={meta} sourceList={sourceList} />
          )}
        </Form.Field>
      </div>

      <Form.Field name={`${baseName}.type`} className="w-full">
        {({ control: typeControl }) =>
          typeControl.value === ExportPolicySinkTypeEnum.PROMETHEUS ? (
            <PrometheusField baseName={`${baseName}.prometheusRemoteWrite`} projectId={projectId} />
          ) : null
        }
      </Form.Field>
    </div>
  );
};
