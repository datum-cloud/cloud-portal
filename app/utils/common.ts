/**
 * Common utilities for networking, validation, and error handling
 *
 * Note: The `cn()` utility has been moved to @shadcn
 * Import it from there: import { cn } from '@shadcn/lib/utils'
 */

/**
 * Checks if an IP address is a private (RFC 1918) address
 * Useful for determining if an IP is internal/private vs public/external
 * @param ip - The IP address string to check (e.g., "192.168.1.1")
 * @returns Boolean indicating whether the IP is in a private range
 */
export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);

  return (
    parts[0] === 10 || // 10.0.0.0/8
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // 172.16.0.0 – 172.31.255.255
    (parts[0] === 192 && parts[1] === 168) // 192.168.0.0/16
  );
}

/**
 * Validates if a string is a valid IPv4 address
 * @param ip - The string to validate
 * @returns Boolean indicating if the string is a valid IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');

  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
  });
}

/**
 * Safely parses JSON with error handling
 * @param jsonString - The JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback value
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Delays execution for a specified number of milliseconds
 * @param ms - Number of milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks if a value is not null or undefined
 * @param value - The value to check
 * @returns Boolean indicating if the value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Removes undefined properties from an object
 * @param obj - The object to clean
 * @returns New object with undefined properties removed
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value;
    }
  }

  return result;
}

export function buildNamespace(type: 'organization' | 'project', id: string): string {
  return `${type}-${id}`;
}

/**
 * Trigger a file download in the browser
 * @param content - File content as string
 * @param filename - Name of the file to download
 * @param mimeType - MIME type of the file (default: 'text/plain')
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
