import { Form } from '@datum-cloud/datum-ui/form';

export const AAAARecordField = () => (
  <Form.Field name="aaaa.content" label="IPv6 Address" required>
    <Form.Input placeholder="e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334" />
  </Form.Field>
);
