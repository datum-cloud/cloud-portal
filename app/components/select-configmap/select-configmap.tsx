import { SelectBox, SelectBoxOption } from '@/components/select-box/select-box';
import { IConfigMapControlResponse } from '@/resources/interfaces/config-map.interface';
import { ROUTE_PATH as CONFIGS_LIST_ROUTE_PATH } from '@/routes/old/api+/config+/config-maps+/list';
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';

export const SelectConfigMap = ({
  projectId,
  defaultValue,
  className,
  onValueChange,
  name,
  id,
}: {
  projectId?: string;
  defaultValue?: string;
  className?: string;
  onValueChange: (value?: SelectBoxOption) => void;
  name?: string;
  id?: string;
}) => {
  const fetcher = useFetcher({ key: 'select-configmap' });
  const [options, setOptions] = useState<SelectBoxOption[]>([]);

  const fetchOptions = async () => {
    fetcher.load(`${CONFIGS_LIST_ROUTE_PATH}?projectId=${projectId}`);
  };

  useEffect(() => {
    if (projectId) {
      fetchOptions();
    }
  }, [projectId]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const opt = (fetcher.data ?? []).map((configMap: IConfigMapControlResponse) => ({
        value: configMap.name,
        label: configMap.name,
        ...configMap,
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
      placeholder="Select a Config Map"
      isLoading={fetcher.state === 'loading'}
    />
  );
};
