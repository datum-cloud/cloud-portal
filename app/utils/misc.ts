import {
  ControlPlaneStatus,
  IControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface'
import { ILabel } from '@/resources/interfaces/label.interface'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines multiple class names using clsx and tailwind-merge
 * Useful for conditionally applying Tailwind CSS classes
 * @param inputs - Array of class values to be merged
 * @returns Merged class string with Tailwind conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts initials from a name string
 * Useful for avatar placeholders or abbreviated displays
 * @param name - The full name to extract initials from
 * @returns String containing up to 2 uppercase initials
 */
export function getInitials(name: string): string {
  if (!name) return ''

  // Split on whitespace and get first letter of each part
  const parts = name.trim().split(/\s+/)
  const initials = parts
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2) // Take max 2 initials
    .join('')

  return initials
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
    .join(' ')
}

/**
 * Splits a string option into key-value pair based on a separator
 * Useful for parsing label strings in the format "key:value"
 * @param option - The string to split
 * @param separator - The separator character (default: ':')
 * @returns Object containing the key and value parts
 */
export function splitOption(
  option: string,
  separator = ':',
): { key: string; value: string } {
  const firstColonIndex = option.indexOf(separator)
  const key = option.substring(0, firstColonIndex)
  const value = option.substring(firstColonIndex + 1)
  return { key, value }
}

/**
 * Converts an array of label strings to an object
 * Useful for transforming label arrays to a key-value record
 * @param labels - Array of strings or single string in the format "key:value" to convert to object
 * @returns Record object with keys and values extracted from the labels
 */
export function convertLabelsToObject(labels: string | string[]): Record<string, string> {
  const labelArray = Array.isArray(labels) ? labels : [labels]
  return labelArray.reduce(
    (acc, opt) => {
      const { key, value } = splitOption(opt)
      acc[key] = value
      return acc
    },
    {} as Record<string, string>,
  )
}

/**
 * Converts a label object to an array of label strings
 * Useful for transforming a key-value record to label strings
 * @param labels - Object containing label key-value pairs
 * @returns Array of strings in the format "key:value"
 */
export function convertObjectToLabels(labels: ILabel): string[] {
  return Object.entries(labels).map(([key, value]) => `${key}:${value}`)
}

/**
 * Filters labels by excluding those with specified prefixes
 * Useful for removing system or internal labels from display
 * @param labels - Record object containing all labels
 * @param skipPrefixes - Array of prefixes to exclude (default: ['resourcemanager'])
 * @returns Filtered record object with matching labels removed
 */
export function filterLabels(
  labels: Record<string, string>,
  skipPrefixes: string[] = ['resourcemanager'],
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(labels).filter(
      ([key]) => !skipPrefixes.some((prefix) => key.startsWith(prefix)),
    ),
  )
}

/**
 * Extracts a short ID from a full ID string
 * Useful for displaying shortened versions of UUIDs or long identifiers
 * @param id - The full ID string to shorten
 * @param length - The desired length of the short ID (default: 8)
 * @returns The shortened ID string
 */
export function getShortId(id: string, length: number = 8): string {
  if (!id) return ''

  // If the ID is already shorter than or equal to the desired length, return it as is
  if (id.length <= length) return id

  // Otherwise, return the first 'length' characters
  return id.substring(0, length)
}

export function transformControlPlaneStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  status: any,
): IControlPlaneStatus {
  const { conditions, ...rest } = status
  if (status && (conditions ?? []).length > 0) {
    const condition = conditions?.[0]
    // const isFailed = condition?.lastTransitionTime
    //   ? differenceInMinutes(new Date(), new Date(condition.lastTransitionTime)) > 10
    //   : false
    const isFailed = false
    return {
      isReady:
        condition?.status === 'True'
          ? ControlPlaneStatus.Success
          : isFailed
            ? ControlPlaneStatus.Error
            : ControlPlaneStatus.Pending,
      message: condition?.message ?? '',
      ...rest,
    }
  }

  return {
    isReady: ControlPlaneStatus.Pending,
    message: 'Resource is being provisioned...',
  }
}
