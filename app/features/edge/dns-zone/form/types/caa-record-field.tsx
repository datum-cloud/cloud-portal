import { Form } from '@datum-cloud/datum-ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';

const CAA_TAGS = [
  { value: 'issue', label: 'issue - Authorization to issue certificates' },
  { value: 'issuewild', label: 'issuewild - Authorization to issue wildcard certificates' },
  { value: 'iodef', label: 'iodef - URL for incident reporting' },
];

export const CAARecordField = () => (
  <>
    <Form.Field name="caa.flag" label="Flag" required>
      <Form.Input type="number" placeholder="0" min={0} max={255} />
    </Form.Field>

    <Form.Field name="caa.tag" label="Tag" required className="col-span-full sm:col-span-2">
      {({ control, meta }) => (
        <Select
          name={meta.name}
          defaultValue="issue"
          onValueChange={(value) => control.change(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select tag" />
          </SelectTrigger>
          <SelectContent>
            {CAA_TAGS.map((tag) => (
              <SelectItem key={tag.value} value={tag.value}>
                {tag.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Form.Field>

    <Form.Field name="caa.value" label="Value" required>
      <Form.Input placeholder="e.g., letsencrypt.org" />
    </Form.Field>
  </>
);
