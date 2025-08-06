import { z } from 'zod';

/**
 * Creates a reusable Zod schema for validating a Fully Qualified Domain Name (FQDN).
 *
 * @param fieldName The name of the field to be used in validation messages. Defaults to 'Domain'.
 *
 * This schema ensures that the domain name adheres to the following rules:
 * 1. It is a non-empty string.
 * 2. It is trimmed and converted to lowercase.
 * 3. It contains at least one dot.
 * 4. Each part (label) is between 1 and 63 characters long.
 * 5. Labels consist of only alphanumeric characters and hyphens.
 * 6. Labels do not start or end with a hyphen.
 */
export const createFqdnSchema = (fieldName = 'Domain') =>
  z
    .string({
      required_error: `${fieldName} is required.`,
      invalid_type_error: `${fieldName} must be a string.`,
    })
    .trim()
    .min(1, { message: `${fieldName} cannot be empty.` })
    .max(253, { message: `${fieldName} must not exceed 253 characters.` })
    .transform((value) => value.toLowerCase())
    .refine((value) => value.includes('.'), {
      message: `${fieldName} must be fully qualified (e.g., "example.com").`,
    })
    .refine(
      (value) => {
        const labels = value.split('.');
        return labels.every((label) => label.length > 0 && label.length <= 63);
      },
      {
        message: `Each part of the ${fieldName.toLowerCase()} must be between 1 and 63 characters long.`,
      }
    )
    .refine((value) => /^[a-z0-9.-]+$/.test(value), {
      message: `${fieldName} can only contain letters, numbers, dots, and hyphens.`,
    })
    .refine(
      (value) => {
        const labels = value.split('.');
        return labels.every((label) => !label.startsWith('-') && !label.endsWith('-'));
      },
      {
        message: `${fieldName} labels cannot start or end with a hyphen.`,
      }
    );
