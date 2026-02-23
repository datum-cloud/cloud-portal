import { Form } from '@datum-ui/components/form';

export const TXTRecordField = () => (
  <Form.Field name="txt.content" label="Text Content" required className="col-span-4">
    <Form.Input placeholder="e.g., v=spf1 include:_spf.example.com ~all" maxLength={255} />
  </Form.Field>
);
