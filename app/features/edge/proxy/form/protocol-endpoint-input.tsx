import { isIPAddress } from '@/utils/helpers/validation.helper';
import { useInputControl } from '@conform-to/react';
import { Form } from '@datum-ui/components/form';
import { InputWithAddons } from '@datum-ui/components/input-with-addons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/ui/select';
import { useEffect, useMemo } from 'react';

/**
 * Custom component that combines protocol selector with endpoint input.
 * Used in proxy forms to allow users to select HTTP/HTTPS protocol and enter an endpoint hostname.
 *
 * When the entered origin is an IP address, the protocol is forced to HTTPS.
 */
interface ProtocolEndpointInputProps {
  autoFocus?: boolean;
  onIPChange?: (isIP: boolean) => void;
}

export const ProtocolEndpointInput = ({ autoFocus, onIPChange }: ProtocolEndpointInputProps) => {
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

  const isIP = useMemo(() => {
    if (!endpointValue) return false;
    const hostname = endpointValue.split(':')[0];
    return isIPAddress(hostname);
  }, [endpointValue]);

  useEffect(() => {
    if (isIP && protocolValue !== 'https') {
      protocolControl.change('https');
    }
  }, [isIP, protocolValue, protocolControl]);

  useEffect(() => {
    onIPChange?.(isIP);
  }, [isIP, onIPChange]);

  return (
    <InputWithAddons
      leading={
        <Select
          value={protocolValue}
          onValueChange={protocolControl.change}
          name={protocolField.name}
          disabled={isIP}>
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
