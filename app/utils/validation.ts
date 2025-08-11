import { z } from 'zod';

export const createNameSchema = (fieldName = 'Name') =>
  z
    .string({ required_error: `${fieldName} is required.` })
    .min(1, { message: `${fieldName} is required.` })
    .max(63, { message: `${fieldName} must be at most 63 characters long.` })
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
      message: `${fieldName} must use lowercase letters, numbers, and hyphens only. Must start and end with a letter or number.`,
    });

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

/**
 * Creates a reusable Zod schema for validating hostnames according to RFC 1123 definition.
 *
 * This schema is designed for HTTPProxy hostnames that match against the HTTP Host header.
 * Valid hostnames are determined by RFC 1123 definition with one notable exception: IPs are not allowed.
 *
 * @param fieldName The name of the field to be used in validation messages. Defaults to 'Hostname'.
 * @param required Whether the field is required. Defaults to true.
 *
 * Validation rules:
 * 1. Must follow RFC 1123 hostname format
 * 2. Can include wildcard prefix (e.g., '*.example.com')
 * 3. Wildcard (*) must appear by itself as the first label only
 * 4. IP addresses (IPv4/IPv6) are explicitly not allowed
 * 5. Maximum length of 253 characters total
 * 6. Each label must be 1-63 characters
 * 7. Labels can contain letters, numbers, and hyphens
 * 8. Labels cannot start or end with hyphens
 * 9. Must contain at least one dot (except for wildcard cases)
 */
export const createHostnameSchema = (fieldName = 'Hostname') =>
  z
    .string({ required_error: `${fieldName} is required` })
    .trim()
    .min(1, { message: `${fieldName} cannot be empty` })
    .max(253, { message: `${fieldName} must not exceed 253 characters` })
    .transform((val) => val.toLowerCase())
    // Check for valid RFC 1123 hostname format with optional wildcard
    .refine(
      (val) => {
        if (!val) return true;

        // Allow wildcard prefix
        const wildcardPattern = /^\*\./;
        const isWildcard = wildcardPattern.test(val);
        const hostname = isWildcard ? val.substring(2) : val;

        // RFC 1123 hostname pattern: letters, numbers, dots, hyphens
        // Must start and end with alphanumeric, hyphens only in middle
        const rfc1123Pattern =
          /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;

        return rfc1123Pattern.test(hostname);
      },
      {
        message: `${fieldName} must follow RFC 1123 format (e.g., 'example.com' or '*.example.com')`,
      }
    )
    // Ensure wildcard is only at the beginning and by itself
    .refine(
      (val) => {
        if (!val || !val.includes('*')) return true;
        return val.startsWith('*.') && val.indexOf('*', 2) === -1;
      },
      {
        message:
          'Wildcard (*) must appear only at the beginning as a separate label (e.g., *.example.com)',
      }
    )
    // Reject IPv4 addresses
    .refine(
      (val) => {
        if (!val) return true;
        const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        return !ipv4Pattern.test(val);
      },
      {
        message: 'IP addresses are not allowed as hostnames',
      }
    )
    // Reject IPv6 addresses
    .refine(
      (val) => {
        if (!val) return true;
        const ipv6Pattern = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
        return !ipv6Pattern.test(val);
      },
      {
        message: 'IP addresses are not allowed as hostnames',
      }
    )
    // Ensure hostname has at least one dot (unless it's a wildcard)
    .refine(
      (val) => {
        if (!val) return true;
        if (val.startsWith('*.')) return val.substring(2).includes('.');
        return val.includes('.');
      },
      {
        message: `${fieldName} must be fully qualified (e.g., 'example.com')`,
      }
    )
    // Validate individual labels don't start/end with hyphens
    .refine(
      (val) => {
        if (!val) return true;
        const hostname = val.startsWith('*.') ? val.substring(2) : val;
        const labels = hostname.split('.');
        return labels.every(
          (label) =>
            label.length > 0 && label.length <= 63 && !label.startsWith('-') && !label.endsWith('-')
        );
      },
      {
        message: `${fieldName} labels must be 1-63 characters and cannot start or end with hyphens`,
      }
    );
