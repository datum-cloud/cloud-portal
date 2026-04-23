import { Form } from '@datum-cloud/datum-ui/form';

export const CNAMERecordField = () => (
  <Form.Field name="cname.content" label="Target Domain" required>
    <Form.Input placeholder="e.g., example.com" />
  </Form.Field>
);
