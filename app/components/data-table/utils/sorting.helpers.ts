import { Row, SortingFn } from '@tanstack/react-table';

/**
 * Safely access nested properties using dot notation
 * Example: getNestedValue(obj, 'status.registration.registrar.name')
 */
export const getNestedValue = <TData>(obj: TData, path: string): any => {
  const keys = path.split('.');
  let value: any = obj;

  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[key];
  }

  return value;
};

/**
 * Create an accessor function for nested paths
 */
export const createNestedAccessor = <TData>(path: string) => {
  return (row: TData) => getNestedValue(row, path);
};

/**
 * Detect the type of a value for automatic sorting
 */
export const detectValueType = (value: any): 'text' | 'number' | 'date' | 'boolean' => {
  if (value === null || value === undefined) return 'text';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (value instanceof Date) return 'date';
  if (typeof value === 'string') {
    // Check if it's a date string (ISO format)
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
    // Check if it's a number string
    if (!isNaN(Number(value)) && value.trim() !== '') return 'number';
  }
  return 'text';
};

/**
 * Sorting function for text/string values
 */
export const textSortingFn: SortingFn<any> = (rowA, rowB, columnId) => {
  const a = (rowA.getValue(columnId) as string) ?? '';
  const b = (rowB.getValue(columnId) as string) ?? '';
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
};

/**
 * Sorting function for date values
 */
export const dateSortingFn: SortingFn<any> = (rowA, rowB, columnId) => {
  const aValue = rowA.getValue(columnId);
  const bValue = rowB.getValue(columnId);

  const a = aValue ? new Date(aValue as string).getTime() : 0;
  const b = bValue ? new Date(bValue as string).getTime() : 0;

  // Handle invalid dates
  if (isNaN(a)) return isNaN(b) ? 0 : 1;
  if (isNaN(b)) return -1;

  return a - b;
};

/**
 * Sorting function for number values
 */
export const numberSortingFn: SortingFn<any> = (rowA, rowB, columnId) => {
  const a = (rowA.getValue(columnId) as number) ?? 0;
  const b = (rowB.getValue(columnId) as number) ?? 0;
  return a - b;
};

/**
 * Sorting function for boolean values
 */
export const booleanSortingFn: SortingFn<any> = (rowA, rowB, columnId) => {
  const a = rowA.getValue(columnId) as boolean;
  const b = rowB.getValue(columnId) as boolean;
  return a === b ? 0 : a ? -1 : 1;
};

/**
 * Sorting function for array values (by length)
 */
export const arraySortingFn: SortingFn<any> = (rowA, rowB, columnId) => {
  const a = rowA.getValue(columnId);
  const b = rowB.getValue(columnId);

  const aLength = Array.isArray(a) ? a.length : 0;
  const bLength = Array.isArray(b) ? b.length : 0;

  return aLength - bLength;
};

/**
 * Recursively flatten arrays to extract all values at any nesting level
 */
const flattenDeep = (arr: any[]): any[] => {
  return arr.reduce((acc, val) => {
    if (Array.isArray(val)) {
      return acc.concat(flattenDeep(val));
    }
    return acc.concat(val);
  }, []);
};

/**
 * Create a custom sorting function for arrays with nested property sorting
 * Example: sortArrayBy('ips.registrantName') will count unique registrant names from nested arrays
 * Handles: nameservers[] -> ips[] -> registrantName
 */
export const createArrayPropertySortingFn = (propertyPath: string): SortingFn<any> => {
  return (rowA, rowB, columnId) => {
    const aValue = rowA.getValue(columnId);
    const bValue = rowB.getValue(columnId);

    if (!Array.isArray(aValue) && !Array.isArray(bValue)) return 0;
    if (!Array.isArray(aValue)) return 1;
    if (!Array.isArray(bValue)) return -1;

    // Extract unique values from the nested property path, handling nested arrays
    const getUniqueValues = (arr: any[]) => {
      const values = new Set<string>();

      // Split the path to handle nested navigation
      const pathParts = propertyPath.split('.');

      // Start with the root array
      let currentLevel: any[] = arr;

      // Navigate through each part of the path
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const nextLevel: any[] = [];

        // Flatten current level if it contains arrays
        const flattened = flattenDeep(currentLevel);

        // Extract the property from each item
        flattened.forEach((item) => {
          if (item && typeof item === 'object') {
            const value = item[part];
            if (value !== null && value !== undefined) {
              nextLevel.push(value);
            }
          }
        });

        currentLevel = nextLevel;
      }

      // Flatten final level and collect unique values
      const finalValues = flattenDeep(currentLevel);
      finalValues.forEach((value) => {
        if (value !== null && value !== undefined) {
          values.add(String(value));
        }
      });

      return values.size;
    };

    const aCount = getUniqueValues(aValue);
    const bCount = getUniqueValues(bValue);

    return aCount - bCount;
  };
};

/**
 * Get sorting function by type
 */
export const getSortingFnByType = (
  type: 'text' | 'number' | 'date' | 'boolean' | 'array',
  arrayOptions?: { sortArrayBy?: 'length' | string }
): SortingFn<any> => {
  switch (type) {
    case 'text':
      return textSortingFn;
    case 'number':
      return numberSortingFn;
    case 'date':
      return dateSortingFn;
    case 'boolean':
      return booleanSortingFn;
    case 'array':
      if (arrayOptions?.sortArrayBy && arrayOptions.sortArrayBy !== 'length') {
        return createArrayPropertySortingFn(arrayOptions.sortArrayBy);
      }
      return arraySortingFn;
    default:
      return textSortingFn;
  }
};

/**
 * Auto-detect and apply sorting function based on column meta and data
 */
export const autoDetectSortingFn = <TData>(
  rows: Row<TData>[],
  columnId: string
): SortingFn<TData> => {
  if (rows.length === 0) return textSortingFn;

  // Get first non-null value to detect type
  const sampleValue = rows
    .find((row) => {
      const value = row.getValue(columnId);
      return value !== null && value !== undefined;
    })
    ?.getValue(columnId);

  const detectedType = detectValueType(sampleValue);
  return getSortingFnByType(detectedType);
};
