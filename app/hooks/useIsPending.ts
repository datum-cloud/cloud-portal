import { useFetchers, useFormAction, useNavigation } from 'react-router';

/**
 * Custom hook to determine if a form is currently pending submission
 * Useful for showing loading states in forms
 * @param options - Configuration options for the hook
 * @param options.formAction - The form action to check against
 * @param options.formMethod - The HTTP method to check against (default: 'POST')
 * @param options.state - The navigation state to check for (default: 'non-idle')
 * @param options.fetcherKey - Optional key to identify specific fetcher
 * @param options.formId - Optional form identifier to distinguish between multiple forms with the same action
 * @returns Boolean indicating if the specified form action is pending
 */
export function useIsPending({
  formAction,
  formMethod = 'POST',
  state = 'non-idle',
  fetcherKey,
  formId,
}: {
  formAction?: string;
  formMethod?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
  state?: 'submitting' | 'loading' | 'non-idle' | 'idle';
  fetcherKey?: string;
  formId?: string;
} = {}) {
  const contextualFormAction = useFormAction();
  const navigation = useNavigation();

  // Get all active fetchers
  const fetchers = useFetchers();

  // Check if any fetcher matches the criteria
  const isFetcherPending = fetchers.some((fetcher) => {
    // If fetcherKey is provided, use that for exact matching
    if (fetcherKey) {
      return fetcher.key === fetcherKey;
    }

    // If formId is provided, check if this fetcher's key includes the formId
    // Fetcher keys often include the form ID or can be set to include it
    if (formId && fetcher.key && fetcher.key.includes(formId)) {
      // This is our fetcher based on the key
      return (
        fetcher.formAction === (formAction ?? contextualFormAction) &&
        fetcher.formMethod === formMethod &&
        (state === 'non-idle'
          ? (fetcher.state as string) !== 'idle'
          : state === 'submitting'
            ? fetcher.state === 'submitting'
            : fetcher.state === 'loading')
      );
    }

    // If no formId specified, check other criteria
    if (!formId) {
      return (
        fetcher.formAction === (formAction ?? contextualFormAction) &&
        fetcher.formMethod === formMethod &&
        (state === 'non-idle'
          ? (fetcher.state as string) !== 'idle'
          : state === 'submitting'
            ? fetcher.state === 'submitting'
            : fetcher.state === 'loading')
      );
    }

    return false;
  });

  // Check navigation state
  const isPendingState =
    state === 'non-idle' ? navigation.state !== 'idle' : navigation.state === state;

  // For navigation, we can't easily determine which form triggered it when there are multiple forms
  // with the same action. We'll need to use a different approach.
  let isNavigationForThisForm = true;

  // If formId is provided, we'll be more strict about matching
  if (formId) {
    // We can check if the current navigation state matches our expected criteria
    isNavigationForThisForm =
      navigation.formAction === (formAction ?? contextualFormAction) &&
      navigation.formMethod === formMethod;

    // If we're in a page with multiple forms pointing to the same action,
    // we might need to add additional logic in the component using this hook
    // For example, by using fetchers instead of regular form submissions
  }

  // Return true if either navigation or fetcher is pending
  return (
    isFetcherPending ||
    (isPendingState &&
      navigation.formAction === (formAction ?? contextualFormAction) &&
      navigation.formMethod === formMethod &&
      isNavigationForThisForm)
  );
}
