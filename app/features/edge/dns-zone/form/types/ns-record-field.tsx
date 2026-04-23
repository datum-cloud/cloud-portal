import { Form } from '@datum-cloud/datum-ui/form';

export const NSRecordField = () => (
  <Form.Field name="ns.content" label="Nameserver" required>
    <Form.Input placeholder="e.g., ns1.example.com" />
  </Form.Field>
);
