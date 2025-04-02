import { useFetchers, useFormAction, useNavigation } from 'react-router'

/**
 * Custom hook to determine if a form is currently pending submission
 * Useful for showing loading states in forms
 * @param options - Configuration options for the hook
 * @param options.formAction - The form action to check against
 * @param options.formMethod - The HTTP method to check against (default: 'POST')
 * @param options.state - The navigation state to check for (default: 'non-idle')
 * @returns Boolean indicating if the specified form action is pending
 */
export function useIsPending({
  formAction,
  formMethod = 'POST',
  state = 'non-idle',
  fetcherKey,
}: {
  formAction?: string
  formMethod?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE'
  state?: 'submitting' | 'loading' | 'non-idle' | 'idle'
  fetcherKey?: string
} = {}) {
  const contextualFormAction = useFormAction()
  const navigation = useNavigation()

  // Get all active fetchers
  const fetchers = useFetchers()

  // Check if any fetcher matches the criteria
  const isFetcherPending = fetchers.some((fetcher) =>
    fetcherKey
      ? fetcher.key === fetcherKey
      : fetcher.formAction === (formAction ?? contextualFormAction) &&
        fetcher.formMethod === formMethod &&
        (state === 'non-idle'
          ? (fetcher.state as string) !== 'idle'
          : state === 'submitting'
            ? fetcher.state === 'submitting'
            : fetcher.state === 'loading'),
  )

  // Check navigation state
  const isPendingState =
    state === 'non-idle' ? navigation.state !== 'idle' : navigation.state === state

  // Return true if either navigation or fetcher is pending
  return (
    isFetcherPending ||
    (isPendingState &&
      navigation.formAction === (formAction ?? contextualFormAction) &&
      navigation.formMethod === formMethod)
  )
}
