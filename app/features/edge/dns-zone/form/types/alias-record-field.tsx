import { Form } from '@datum-ui/components/new-form';

export const ALIASRecordField = () => (
  <Form.Field name="alias.content" label="Target Domain" required>
    <Form.Input placeholder="e.g., example.com" />
  </Form.Field>
);
