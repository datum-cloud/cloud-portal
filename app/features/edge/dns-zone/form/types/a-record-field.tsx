import { Form } from '@datum-cloud/datum-ui/form';

export const ARecordField = () => (
  <Form.Field name="a.content" label="IPv4 Address" required>
    <Form.Input placeholder="e.g., 192.168.1.1" />
  </Form.Field>
);
