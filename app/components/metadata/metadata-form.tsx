import { InputName } from '@/components/input-name/input-name';
import { SelectAnnotations } from '@/components/select-annotations/select-annotations';
import { SelectLabels } from '@/components/select-labels/select-labels';
import { Form } from '@datum-ui/components/form';

export const MetadataForm = ({ isEdit = false }: { isEdit?: boolean }) => {
  return (
    <div className="space-y-4">
      <Form.Field name="name" required>
        {({ field }) => (
          <InputName
            required
            description="This unique resource name will be used to identify your resource and cannot be changed."
            readOnly={isEdit}
            field={field}
            autoGenerate={false}
            autoFocus={!isEdit}
          />
        )}
      </Form.Field>

      <Form.Field
        name="labels"
        label="Labels"
        description="Add labels to help identify, organize, and filter your resource.">
        {({ control }) => (
          <SelectLabels
            defaultValue={control.value as string[]}
            onChange={(value) => control.change(value)}
          />
        )}
      </Form.Field>

      <Form.Field
        name="annotations"
        label="Annotations"
        description="Add annotations to help identify, organize, and filter your resource.">
        {({ control }) => (
          <SelectAnnotations
            defaultValue={control.value as string[]}
            onChange={(value) => control.change(value)}
          />
        )}
      </Form.Field>
    </div>
  );
};
