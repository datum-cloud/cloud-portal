import { SelectBox, SelectBoxOption } from '../select-box/select-box';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { ROUTE_PATH as SECRETS_LIST_ROUTE_PATH } from '@/routes/api+/config+/secrets+/list';
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';

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
  const fetcher = useFetcher({ key: 'select-secret' });

  const [options, setOptions] = useState<SelectBoxOption[]>([]);

  const fetchOptions = async () => {
    fetcher.load(`${SECRETS_LIST_ROUTE_PATH}?projectId=${projectId}`);
  };

  useEffect(() => {
    if (projectId) {
      fetchOptions();
    }
  }, [projectId]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const opt = (fetcher.data ?? [])
        .filter((secret: ISecretControlResponse) => {
          if (!filter) return true;
          return Object.entries(filter).every(
            ([key, value]) => secret[key as keyof ISecretControlResponse] === value
          );
        })
        .map((secret: ISecretControlResponse) => ({
          value: secret.name,
          label: secret.name,
          ...secret,
        }));

      setOptions(opt);
    }
  }, [fetcher.data, fetcher.state]);

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
      isLoading={fetcher.state === 'loading'}
    />
  );
};
