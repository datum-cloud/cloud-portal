import {
  ControlPlaneStatus,
  IControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface';
import { ILabel } from '@/resources/interfaces/label.interface';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names using clsx and tailwind-merge
 * Useful for conditionally applying Tailwind CSS classes
 * @param inputs - Array of class values to be merged
 * @returns Merged class string with Tailwind conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

/**
/**
 * HTTP.
 */

export function getDomainUrl(request: Request) {
  const host = request.headers.get('X-Forwarded-Host') ?? request.headers.get('Host');
  if (!host) return null;

  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

export function getDomainPathname(request: Request) {
  const pathname = new URL(request.url).pathname;
  if (!pathname) return null;
  return pathname;
}

/**
 * Combines multiple header objects into one (Headers are appended not overwritten).
 */
export function combineHeaders(...headers: Array<ResponseInit['headers'] | null | undefined>) {
  const combined = new Headers();
  for (const header of headers) {
    if (!header) continue;
    for (const [key, value] of new Headers(header).entries()) {
      combined.append(key, value);
    }
  }
  return combined;
}

/**
 * Singleton Server-Side Pattern.
 */
export function singleton<Value>(name: string, value: () => Value): Value {
  const globalStore = global as unknown as {
    __singletons?: Record<string, Value>;
  };

  globalStore.__singletons ??= {};
  globalStore.__singletons[name] ??= value();

  return globalStore.__singletons[name];
}

/**
 * Extracts initials from a name string
 * Useful for avatar placeholders or abbreviated displays
 * @param name - The full name to extract initials from
 * @returns String containing up to 2 uppercase initials
 */
export function getInitials(name: string): string {
  if (!name) return '';

  // Split on whitespace and get first letter of each part
  const parts = name.trim().split(/\s+/);
  const initials = parts
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2) // Take max 2 initials
    .join('');

  return initials;
}

/**
 * Converts a string to title case, handling camelCase and snake_case
 * Useful for displaying formatted labels from code identifiers
 * @param str - The string to convert to title case
 * @returns Formatted string in title case with spaces between words
 */
export function toTitleCase(str: string): string {
  // Handle camelCase and snake_case by splitting on capitals and underscores
  return str
    .split(/(?=[A-Z])|_/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

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
 * Extracts a short ID from a full ID string
 * Useful for displaying shortened versions of UUIDs or long identifiers
 * @param id - The full ID string to shorten
 * @param length - The desired length of the short ID (default: 8)
 * @returns The shortened ID string
 */
export function getShortId(id: string, length: number = 8): string {
  if (!id) return '';

  // If the ID is already shorter than or equal to the desired length, return it as is
  if (id.length <= length) return id;

  // Otherwise, return the first 'length' characters
  return id.substring(0, length);
}

export function transformControlPlaneStatus(status: any): IControlPlaneStatus {
  if (!status) return { status: ControlPlaneStatus.Pending, message: '' };

  const { conditions, ...rest } = status;
  if (status && (conditions ?? []).length > 0) {
    const condition = conditions?.[0];
    // const isFailed = condition?.lastTransitionTime
    //   ? differenceInMinutes(new Date(), new Date(condition.lastTransitionTime)) > 10
    //   : false
    const isFailed = false;
    return {
      status:
        condition?.status === 'True'
          ? ControlPlaneStatus.Success
          : isFailed
            ? ControlPlaneStatus.Error
            : ControlPlaneStatus.Pending,
      message: condition?.message ?? '',
      ...rest,
    };
  }

  return {
    status: ControlPlaneStatus.Pending,
    message: 'Resource is being provisioned...',
  };
}

export function isBase64(str: string): boolean {
  if (typeof str !== 'string' || !str) {
    return false;
  }

  try {
    const decoded = atob(str);
    return btoa(decoded) === str;
  } catch (e) {
    return false;
  }
}

export function toBase64(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  try {
    // Step 1: Use TextEncoder to get UTF-8 bytes (Uint8Array)
    const utf8Bytes = new TextEncoder().encode(str);

    // Step 2: Convert the ArrayBuffer/Uint8Array to a binary string
    // (a string where each character's code point is a byte value 0-255)
    let binaryString = '';
    utf8Bytes.forEach((byte) => {
      binaryString += String.fromCharCode(byte);
    });

    // Step 3: Use btoa on the binary string
    return btoa(binaryString);
  } catch (error) {
    console.error('Base64 encoding failed:', error);
    // Handle cases where btoa or TextEncoder might fail or not be available
    return '';
  }
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
