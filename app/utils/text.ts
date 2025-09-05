/**
 * Text manipulation, formatting, and ID generation utilities
 */

// ============================================================================
// STRING UTILITIES (from string.ts)
// ============================================================================

export function toBoolean(value: string | boolean | undefined | null): boolean {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  return value.toLowerCase() === 'true';
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

/**
 * Checks if a string is valid base64
 * @param str - The string to check
 * @returns Boolean indicating if the string is valid base64
 */
export function isBase64(str: string): boolean {
  if (typeof str !== 'string' || !str) {
    return false;
  }

  try {
    const decoded = atob(str);
    return btoa(decoded) === str;
  } catch {
    return false;
  }
}

/**
 * Converts a string to base64 encoding
 * @param str - The string to encode
 * @returns Base64 encoded string
 */
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
 * Converts a string to kebab-case
 * @param str - The string to convert
 * @returns String in kebab-case format
 */
export const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/\./g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Generates a random string of specified length
 * @param length - The desired length of the random string
 * @returns Random string containing lowercase letters and numbers
 */
export const generateRandomString = (length: number): string => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join('');
};

// ============================================================================
// ID GENERATION UTILITIES (from idGenerator.ts)
// ============================================================================

/**
 * Options for ID generation
 */
interface IdGeneratorOptions {
  prefix?: string;
  suffix?: string;
  randomLength?: number;
  randomText?: string;
  maxLength?: number;
  separator?: string;
  includeTimestamp?: boolean;
  customValidation?: (id: string) => boolean;
}

const DEFAULT_OPTIONS: Required<IdGeneratorOptions> = {
  prefix: '',
  suffix: '',
  randomLength: 6,
  randomText: '',
  maxLength: 30,
  separator: '-',
  includeTimestamp: false,
  customValidation: () => true,
};

const ALLOWED_CHARS = /^[a-z0-9-]+$/;

/**
 * Gets a timestamp string for ID generation
 * @returns Timestamp string in base36 format
 */
const getTimestamp = (): string => {
  return Date.now().toString(36);
};

/**
 * Validates an ID according to common naming rules
 * @param id - The ID to validate
 * @returns Boolean indicating if the ID is valid
 */
const validateId = (id: string): boolean => {
  return (
    id.length >= 3 &&
    id.length <= 63 && // GCP-like limit
    ALLOWED_CHARS.test(id) &&
    !/^-|-$/.test(id) // no leading/trailing hyphens
  );
};

/**
 * Generates a unique ID based on a name and options
 * @param name - The base name for the ID
 * @param options - Configuration options for ID generation
 * @returns Generated ID string
 */
export const generateId = (name: string, options: IdGeneratorOptions = {}): string => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  try {
    const parts: string[] = [];

    // Add prefix
    if (config.prefix) {
      parts.push(toKebabCase(config.prefix));
    }

    // Add main name
    parts.push(toKebabCase(name));

    // Add suffix
    if (config.suffix) {
      parts.push(toKebabCase(config.suffix));
    }

    // Join parts
    let baseId = parts.join(config.separator);

    // Calculate remaining length for random part
    const randomPart = config.randomText
      ? config.randomText
      : generateRandomString(config.randomLength);
    const timestampPart = config.includeTimestamp ? getTimestamp() : '';

    const maxBaseLength =
      config.maxLength - randomPart.length - (timestampPart ? timestampPart.length + 1 : 0) - 1;

    // Truncate if necessary
    if (baseId.length > maxBaseLength) {
      baseId = baseId.slice(0, maxBaseLength);
    }

    // Build final ID
    const finalId = [baseId, randomPart, ...(timestampPart ? [timestampPart] : [])].join(
      config.separator
    );

    // Validate
    if (!validateId(finalId) || !config.customValidation(finalId)) {
      throw new Error('Generated ID failed validation');
    }

    return finalId;
  } catch (error) {
    console.error('Error generating ID:', error);
    // Fallback to a simple but valid ID
    return `${toKebabCase(name)}-${generateRandomString(8)}`;
  }
};

/**
 * Generates multiple IDs from an array of names
 * @param names - Array of names to generate IDs for
 * @param options - Configuration options for ID generation
 * @returns Array of generated ID strings
 */
export const generateMultipleIds = (names: string[], options?: IdGeneratorOptions): string[] => {
  return names.map((name) => generateId(name, options));
};

/**
 * Validates if an ID meets the standard requirements
 * @param id - The ID to validate
 * @returns Boolean indicating if the ID is valid
 */
export const isValidId = (id: string): boolean => {
  return validateId(id);
};

/**
 * Generates a unique ID that doesn't conflict with existing IDs
 * @param existingIds - Array of existing IDs to avoid conflicts with
 * @param name - The base name for the ID
 * @param options - Configuration options for ID generation
 * @param maxAttempts - Maximum number of attempts to generate a unique ID
 * @returns Generated unique ID string
 */
export const generateUniqueId = (
  existingIds: string[],
  name: string,
  options?: IdGeneratorOptions,
  maxAttempts = 10
): string => {
  let attempt = 0;
  let id: string;

  do {
    id = generateId(name, options);
    attempt++;
  } while (existingIds.includes(id) && attempt < maxAttempts);

  if (attempt >= maxAttempts) {
    throw new Error('Could not generate unique ID after maximum attempts');
  }

  return id;
};

// Export the IdGeneratorOptions type for external use
export type { IdGeneratorOptions };
