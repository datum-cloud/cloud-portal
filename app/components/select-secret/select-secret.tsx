import { useSecrets, type Secret } from '@/resources/secrets';
import { Autocomplete, type AutocompleteOption } from '@datum-cloud/datum-ui/autocomplete';
import { useMemo } from 'react';

export type SelectSecretOption = AutocompleteOption & Secret;

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
  onValueChange: (value?: SelectSecretOption) => void;
  name?: string;
  id?: string;
  filter?: Record<string, string>;
}) => {
  const { data: secrets = [], isLoading } = useSecrets(projectId ?? '', {
    enabled: !!projectId,
  });

  const options = useMemo<SelectSecretOption[]>(() => {
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
    <Autocomplete<SelectSecretOption>
      value={defaultValue}
      className={className}
      onValueChange={(value) => {
        if (!value) {
          onValueChange(undefined);
          return;
        }
        const option = options.find((opt) => opt.value === value);
        onValueChange(option);
      }}
      options={options}
      name={name}
      id={id}
      placeholder="Select a Secret"
      loading={isLoading}
    />
  );
};
