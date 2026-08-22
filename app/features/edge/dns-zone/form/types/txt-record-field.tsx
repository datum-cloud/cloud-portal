import { Form } from '@datum-cloud/datum-ui/form';

export const TXTRecordField = () => (
  <Form.Field name="txt.content" label="Text Content" required className="col-span-full">
    <Form.Textarea
      placeholder="e.g., v=spf1 include:_spf.example.com ~all"
      rows={3}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
    />
  </Form.Field>
);
