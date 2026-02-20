import { useInputControl } from '@conform-to/react';
import { InputWithAddons } from '@datum-ui/components/input-with-addons';
import { Form } from '@datum-ui/components/new-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/ui/select';

/**
 * Custom component that combines protocol selector with endpoint input.
 * Used in proxy forms to allow users to select HTTP/HTTPS protocol and enter an endpoint hostname.
 */
export const ProtocolEndpointInput = ({ autoFocus }: { autoFocus?: boolean }) => {
  const { fields } = Form.useFormContext();
  const protocolField = fields.protocol as any;
  const endpointField = fields.endpointHost as any;

  const protocolControl = useInputControl(protocolField);
  const endpointControl = useInputControl(endpointField);

  const protocolValue =
    (Array.isArray(protocolControl.value) ? protocolControl.value[0] : protocolControl.value) ||
    'https';
  const endpointValue =
    (Array.isArray(endpointControl.value) ? endpointControl.value[0] : endpointControl.value) || '';

  return (
    <InputWithAddons
      leading={
        <Select
          value={protocolValue}
          onValueChange={protocolControl.change}
          name={protocolField.name}>
          <SelectTrigger
            id={protocolField.id}
            className="bg-accent h-6 min-h-6 gap-1 border px-2 py-0 shadow-none focus:ring-0 focus-visible:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="http">http</SelectItem>
            <SelectItem value="https">https</SelectItem>
          </SelectContent>
        </Select>
      }
      value={endpointValue}
      onChange={(e) => endpointControl.change(e.target.value)}
      onBlur={endpointControl.blur}
      name={endpointField.name}
      id={endpointField.id}
      autoFocus={autoFocus}
      placeholder="e.g. api.example.com or 203.0.113.1:8080"
      className="text-xs!"
    />
  );
};
