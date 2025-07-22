'use client';

import { useFilterValue, useFilterUpdater, useFilterClearer } from './data-table-filter-context';
import { FilterCustomProps } from './types';
import { useCallback } from 'react';

export const FilterCustom = ({ filterKey, children }: FilterCustomProps) => {
  const value = useFilterValue(filterKey);
  const updateValue = useFilterUpdater(filterKey);
  const clearValue = useFilterClearer(filterKey);

  const handleChange = useCallback(
    (newValue: any) => {
      updateValue(newValue || null);
    },
    [updateValue]
  );

  const handleClear = useCallback(() => {
    clearValue();
  }, [clearValue]);

  return children({
    value,
    onChange: handleChange,
    onClear: handleClear,
  });
};
