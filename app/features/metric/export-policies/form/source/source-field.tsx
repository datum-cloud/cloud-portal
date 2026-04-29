import { POLICY_SOURCE_TYPES } from '@/features/metric/constants';
import { CodeEditor, type EditorLanguage } from '@datum-cloud/datum-ui/code-editor';
import { Form } from '@datum-cloud/datum-ui/form';
import { cn } from '@datum-cloud/datum-ui/utils';

export const SourceField = ({
  index,
  isEdit = false,
  isMultiple = false,
}: {
  index: number;
  isEdit?: boolean;
  isMultiple?: boolean;
}) => {
  const baseName = `sources.${index}`;

  return (
    <div className="relative flex flex-1 flex-col items-start gap-4">
      <div className="flex w-full flex-col gap-4 sm:flex-row">
        <Form.Field name={`${baseName}.name`} label="Name" required className="w-full sm:w-1/2">
          <Form.Input placeholder="e.g. my-source-3sd122" readOnly={isEdit} autoFocus={!isEdit} />
        </Form.Field>

        <Form.Field name={`${baseName}.type`} label="Type" required className="w-full sm:w-1/2">
          <Form.Select disabled>
            {Object.keys(POLICY_SOURCE_TYPES).map((type) => (
              <Form.SelectItem key={type} value={type}>
                {POLICY_SOURCE_TYPES[type as keyof typeof POLICY_SOURCE_TYPES].label}
              </Form.SelectItem>
            ))}
          </Form.Select>
        </Form.Field>
      </div>

      <Form.Field
        name={`${baseName}.metricQuery`}
        label="MetricsQL Query"
        tooltip="MetricsQL query to select metrics. Default {} selects all metrics."
        required
        className={cn('w-full', isMultiple ? 'max-w-[590px]' : '')}>
        {({ control, meta }) => (
          <CodeEditor
            language={'promql' as EditorLanguage}
            value={(control.value as string) ?? '{}'}
            onChange={(newValue) => control.change(newValue)}
            id={meta.id}
            name={meta.name}
            error={meta.errors?.[0]}
            minHeight="150px"
          />
        )}
      </Form.Field>
    </div>
  );
};
