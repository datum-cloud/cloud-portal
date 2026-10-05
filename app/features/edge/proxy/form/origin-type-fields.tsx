import { workloadNameFromNetworkService } from '@/features/edge/proxy/overview/compute-backend';
import { useNetworkServices } from '@/resources/network-services';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { RadioGroup, RadioGroupItem } from '@datum-cloud/datum-ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { Text } from '@datum-cloud/datum-ui/typography';
import { BoxesIcon, GlobeIcon } from 'lucide-react';

export type OriginType = 'endpoint' | 'networkService';

const ORIGIN_TYPES: Array<{
  value: OriginType;
  label: string;
  hint: string;
  icon: typeof GlobeIcon;
}> = [
  {
    value: 'endpoint',
    label: 'Public internet',
    hint: 'Any HTTP or HTTPS origin',
    icon: GlobeIcon,
  },
  {
    value: 'networkService',
    label: 'Datum compute',
    hint: 'A workload’s service',
    icon: BoxesIcon,
  },
];

/** Origin type as radio cards: an obvious form choice with a fixed height. */
export function OriginTypeCards({
  value,
  onChange,
}: {
  value: OriginType;
  onChange: (value: OriginType) => void;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as OriginType)}
      className="grid grid-cols-2 gap-3">
      {ORIGIN_TYPES.map((option) => (
        <label
          key={option.value}
          htmlFor={`origin-type-${option.value}`}
          className="has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/3 hover:bg-muted/40 flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors">
          <RadioGroupItem
            id={`origin-type-${option.value}`}
            value={option.value}
            className="mt-0.5 shrink-0"
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-1.5">
              <Icon icon={option.icon} size={14} className="text-muted-foreground shrink-0" />
              <Text as="span" size="sm" weight="medium">
                {option.label}
              </Text>
            </span>
            <Text as="span" size="xs" textColor="muted">
              {option.hint}
            </Text>
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}

/**
 * Workload and port selects for a Datum compute origin, written to the form's
 * `serviceName` and `servicePort`. Lists the project's NetworkServices but
 * names each by its workload, since users never create the service itself.
 */
export function WorkloadServiceFields({ projectId }: { projectId: string }) {
  const { data: services = [], isLoading: servicesLoading } = useNetworkServices(projectId);
  const serviceName = Form.useWatch<string>('serviceName') ?? '';
  const selectedService = services.find((service) => service.metadata?.name === serviceName);

  return (
    // One row at every width, the same height as the address field.
    <div className="grid grid-cols-[1fr_7rem] gap-3 sm:grid-cols-[1fr_10rem]">
      <Form.Field name="serviceName" label="Workload" required>
        {({ control }) => (
          // One wrapper: Select renders a hidden native <select> after its
          // trigger, and Form.Field's space-y-2 would give the trigger a
          // bottom margin, making this row taller than the address field.
          <div className="relative">
            <Select
              value={(control.value as string) || undefined}
              onValueChange={control.change}
              disabled={servicesLoading || services.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    servicesLoading
                      ? 'Loading workloads…'
                      : services.length === 0
                        ? 'No workloads serving HTTP in this project'
                        : 'Choose a workload'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => {
                  const name = service.metadata?.name ?? '';
                  const workload = workloadNameFromNetworkService(service);
                  return (
                    <SelectItem key={name} value={name}>
                      {/* The workload, not the NetworkService behind it, which users never create. */}
                      {workload ?? name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
      </Form.Field>
      <Form.Field name="servicePort" label="Port" required>
        {({ control }) => (
          <div className="relative">
            <Select
              // Remount on service change so a stale port never lingers.
              key={serviceName}
              value={(control.value as string) || undefined}
              onValueChange={control.change}
              disabled={!selectedService}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Port" />
              </SelectTrigger>
              <SelectContent>
                {(selectedService?.spec.ports ?? []).map((port) => (
                  <SelectItem key={port.name} value={port.name}>
                    {port.name} · {port.port}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Form.Field>
    </div>
  );
}
