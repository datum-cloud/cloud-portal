import { ILabel } from '@/resources/interfaces/label.interface'
import { type ClassValue, clsx } from 'clsx'
import { useFormAction, useNavigation } from 'react-router'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useIsPending({
  formAction,
  formMethod = 'POST',
  state = 'non-idle',
}: {
  formAction?: string
  formMethod?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE'
  state?: 'submitting' | 'loading' | 'non-idle'
} = {}) {
  const contextualFormAction = useFormAction()
  const navigation = useNavigation()
  const isPendingState =
    state === 'non-idle' ? navigation.state !== 'idle' : navigation.state === state
  return (
    isPendingState &&
    navigation.formAction === (formAction ?? contextualFormAction) &&
    navigation.formMethod === formMethod
  )
}

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

export function toTitleCase(str: string): string {
  // Handle camelCase and snake_case by splitting on capitals and underscores
  return str
    .split(/(?=[A-Z])|_/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Label Utils
export function splitOption(
  option: string,
  separator = ':',
): { key: string; value: string } {
  const firstColonIndex = option.indexOf(separator)
  const key = option.substring(0, firstColonIndex)
  const value = option.substring(firstColonIndex + 1)
  return { key, value }
}

export function convertLabelsToObject(labels: string[]): Record<string, string> {
  return labels.reduce(
    (acc, opt) => {
      const { key, value } = splitOption(opt)
      acc[key] = value
      return acc
    },
    {} as Record<string, string>,
  )
}

export function convertObjectToLabels(labels: ILabel): string[] {
  return Object.entries(labels).map(([key, value]) => `${key}:${value}`)
}

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
