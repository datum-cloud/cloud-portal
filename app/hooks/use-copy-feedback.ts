import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useEffect, useRef, useState } from 'react';

export const COPY_FEEDBACK_RESET_MS = 2000;
export const COPY_SUCCESS_MESSAGE = 'Copied to clipboard';
export const COPY_ERROR_MESSAGE = 'Could not copy to clipboard';

/**
 * Copies a value and tracks the short-lived "Copied" state the copy buttons
 * show. Confirms the copy only when the clipboard write succeeds; otherwise
 * reports the failure and leaves the button in its normal state.
 */
export function useCopyFeedback() {
  const [, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    void copy(value).then((success) => {
      if (!success) {
        if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
        setCopied(false);
        toast.error(COPY_ERROR_MESSAGE);
        return;
      }

      toast.success(COPY_SUCCESS_MESSAGE);
      setCopied(true);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, COPY_FEEDBACK_RESET_MS);
    });
  };

  return { copied, copyToClipboard };
}
