import { ILabel } from '@/resources/interfaces/label.interface';

/**
 * Splits a string option into key-value pair based on a separator
 * Useful for parsing label strings in the format "key:value"
 * @param option - The string to split
 * @param separator - The separator character (default: ':')
 * @returns Object containing the key and value parts
 */
export function splitOption(option: string, separator = ':'): { key: string; value: string } {
  const firstColonIndex = option.indexOf(separator);
  const key = option.substring(0, firstColonIndex);
  const value = option.substring(firstColonIndex + 1);
  return { key, value };
}

/**
 * Converts an array of label strings to an object
 * Useful for transforming label arrays to a key-value record
 * @param labels - Array of strings or single string in the format "key:value" to convert to object
 * @returns Record object with keys and values extracted from the labels
 */
export function convertLabelsToObject(labels: string | string[]): Record<string, any> {
  const labelArray = Array.isArray(labels) ? labels : [labels];
  return labelArray.reduce(
    (acc, opt) => {
      const { key, value } = splitOption(opt);
      acc[key] = value === 'null' ? null : value;
      return acc;
    },

    {} as Record<string, any>
  );
}

/**
 * Converts a label object to an array of label strings
 * Useful for transforming a key-value record to label strings
 * @param labels - Object containing label key-value pairs
 * @returns Array of strings in the format "key:value"
 */
export function convertObjectToLabels(
  labels: ILabel,
  skipPrefixes: string[] = ['resourcemanager']
): string[] {
  return Object.entries(labels)
    .filter(([key]) => !skipPrefixes.some((prefix) => key.startsWith(prefix)))
    .map(([key, value]) => `${key}:${value}`);
}

/**
 * Filters labels by excluding those with specified prefixes
 * Useful for removing system or internal labels from display
 * @param labels - Record object containing all labels
 * @param skipPrefixes - Array of prefixes to exclude (e.g: ['resourcemanager'])
 * @returns Filtered record object with matching labels removed
 */
export function filterLabels(
  labels: Record<string, string>,
  skipPrefixes: string[]
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(labels).filter(([key]) => !skipPrefixes.some((prefix) => key.startsWith(prefix)))
  );
}

/**
 * Calculates the JSON Merge Patch payload for transforming a map of key-value pairs.
 * Handles additions, updates, and removals (by setting removed keys to null in the patch).
 *
 * @param originalMap - The original key-value map (e.g., current labels/annotations from K8s)
 * @param desiredMap - The desired final key-value map (e.g., state after edits)
 * @returns Object to be used as value in a JSON Merge Patch payload with null for keys to remove
 */
export function generateMergePatchPayloadMap(
  originalMap: Record<string, string | null>,
  desiredMap: Record<string, string | null>
): Record<string, string | null> {
  // Handle null/undefined inputs
  const safeOriginalMap = originalMap ?? {};
  const safeDesiredMap = desiredMap ?? {};

  // Early return if both maps are empty
  if (Object.keys(safeOriginalMap).length === 0 && Object.keys(safeDesiredMap).length === 0) {
    return {};
  }

  const patchMap: Record<string, string | null> = {};

  // Process additions and updates
  for (const [key, desiredValue] of Object.entries(safeDesiredMap)) {
    const originalValue = safeOriginalMap[key];
    if (!(key in safeOriginalMap) || originalValue !== desiredValue) {
      patchMap[key] = desiredValue;
    }
  }

  // Process removals
  for (const key of Object.keys(safeOriginalMap)) {
    if (!(key in safeDesiredMap)) {
      patchMap[key] = null;
    }
  }

  return Object.keys(patchMap).length > 0 ? patchMap : { ...safeOriginalMap };
}
