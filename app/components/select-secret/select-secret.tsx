import { SelectBox, SelectBoxOption } from '../select-box/select-box';
import { useSecrets, type Secret } from '@/resources/secrets';
import { useMemo } from 'react';

export const SelectSecret = ({
  projectId,
  defaultValue,
  className,
  onValueChange,
  name,
  id,
  filter,
}: {
  projectId?: string;
  defaultValue?: string;
  className?: string;
  onValueChange: (value?: SelectBoxOption) => void;
  name?: string;
  id?: string;
  filter?: Record<string, string>;
}) => {
  const { data: secrets = [], isLoading } = useSecrets(projectId ?? '', {
    enabled: !!projectId,
  });

  const options = useMemo(() => {
    return secrets
      .filter((secret: Secret) => {
        if (!filter) return true;
        return Object.entries(filter).every(
          ([key, value]) => secret[key as keyof Secret] === value
        );
      })
      .map((secret: Secret) => ({
        value: secret.name,
        label: secret.name,
        ...secret,
      }));
  }, [secrets, filter]);

  return (
    <SelectBox
      value={defaultValue}
      className={className}
      onChange={(value: SelectBoxOption) => {
        if (value) {
          onValueChange(value);
        }
      }}
      options={options}
      name={name}
      id={id}
      placeholder="Select a Secret"
      isLoading={isLoading}
    />
  );
};
