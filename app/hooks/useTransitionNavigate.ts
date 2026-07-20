import { useCallback, useState } from 'react';
import { useNavigate, useNavigation, type NavigateOptions, type To } from 'react-router';

/**
 * Keeps loading UI active from async work through route navigation.
 * Form.Root clears its internal spinner when `onSubmit`'s promise settles —
 * we intentionally never resolve after a successful navigate so loading holds
 * until this route unmounts.
 */
export function useTransitionNavigate() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [isLeaving, setIsLeaving] = useState(false);

  const transitionNavigate = useCallback(
    (to: To, options?: NavigateOptions) => {
      navigate(to, options);
    },
    [navigate]
  );

  const submitAndNavigate = useCallback(
    async (task: () => Promise<unknown>, to: To, options?: NavigateOptions) => {
      setIsLeaving(true);
      try {
        await task();
        transitionNavigate(to, options);
        await new Promise<void>(() => {});
      } catch (error) {
        setIsLeaving(false);
        throw error;
      }
    },
    [transitionNavigate]
  );

  const isNavigating =
    isLeaving || navigation.state === 'loading' || navigation.state === 'submitting';

  return { navigate: transitionNavigate, submitAndNavigate, isNavigating };
}
