import { z } from 'zod';

export const createNameSchema = (fieldName = 'Resource name') =>
  z
    .string({ error: `${fieldName} is required.` })
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
      error: (issue) => {
        if (issue.code === 'invalid_type') {
          return `${fieldName} must be a string.`;
        }
        return `${fieldName} is required.`;
      },
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
 * This schema is designed for Proxy hostnames that match against the HTTP Host header.
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
    .string({ error: `${fieldName} is required` })
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

/**
 * Checks if a given string is a valid IP address (IPv4 or IPv6)
 *
 * @param host The string to check (handles bracketed IPv6 from URL.hostname like [2001:db8::1])
 * @returns true if the string is a valid IPv4 or IPv6 address, false otherwise
 */
export const isIPAddress = (host: string): boolean => {
  if (!host) return false;

  // Strip brackets from IPv6 addresses (URL.hostname returns [2001:db8::1] for IPv6)
  const normalizedHost = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

  // IPv4: four octets 0-255
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(normalizedHost)) {
    return normalizedHost.split('.').every((octet) => {
      const num = Number(octet);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6: comprehensive validation including compressed formats
  // Handles: ::1, 2001:db8::1, ::, fe80::1, etc.
  // Based on RFC 5952 recommendations
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9]))$/;

  return ipv6Regex.test(normalizedHost);
};
