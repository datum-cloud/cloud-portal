import { useNavigation, useFormAction } from 'react-router'
import { clsx, type ClassValue } from 'clsx'
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

export function generateProjectId(name: string, suffix?: string): string {
  const randomSuffix = suffix ?? Math.random().toString(36).substring(2, 8)
  const baseId = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Keep spaces
    .replace(/\s+/g, '-') // Replace spaces with dashes
  return `${baseId}-${randomSuffix}`
}

export function generateRandomId(length: number = 6): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
}
