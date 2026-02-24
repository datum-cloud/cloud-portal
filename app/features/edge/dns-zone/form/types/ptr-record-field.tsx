import { Form } from '@datum-ui/components/form';

export const PTRRecordField = () => (
  <Form.Field name="ptr.content" label="Target Domain" required>
    <Form.Input placeholder="e.g., host.example.com" />
  </Form.Field>
);
