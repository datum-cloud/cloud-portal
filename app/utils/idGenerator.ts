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

const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const generateRandomString = (length: number): string => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join('');
};

const getTimestamp = (): string => {
  return Date.now().toString(36);
};

const validateId = (id: string): boolean => {
  return (
    id.length >= 3 &&
    id.length <= 63 && // GCP-like limit
    ALLOWED_CHARS.test(id) &&
    !/^-|-$/.test(id) // no leading/trailing hyphens
  );
};

const generateId = (name: string, options: IdGeneratorOptions = {}): string => {
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

// Additional utility functions you might need
const generateMultipleIds = (names: string[], options?: IdGeneratorOptions): string[] => {
  return names.map((name) => generateId(name, options));
};

const isValidId = (id: string): boolean => {
  return validateId(id);
};

const generateUniqueId = (
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

// Export all functions
export {
  generateId,
  generateMultipleIds,
  isValidId,
  generateUniqueId,
  toKebabCase,
  generateRandomString,
};
