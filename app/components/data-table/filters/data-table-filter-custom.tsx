'use client';

import { useFilterUpdater } from './data-table-filter-context';
import { FilterCustomProps } from './types';
import { useQueryState, parseAsString } from 'nuqs';
import { useCallback } from 'react';

export const FilterCustom = ({ filterKey, children }: FilterCustomProps) => {
  // Register with context
  useFilterUpdater(filterKey);

  // Use nuqs directly for state management
  const [value, setValue] = useQueryState(
    filterKey,
    parseAsString.withDefault('').withOptions({
      shallow: false,
      throttleMs: 300,
    })
  );

  const handleChange = useCallback(
    (newValue: any) => {
      setValue(newValue || null);
    },
    [setValue]
  );

  const handleClear = useCallback(() => {
    setValue(null);
  }, [setValue]);

  return children({
    value,
    onChange: handleChange,
    onClear: handleClear,
  });
};
