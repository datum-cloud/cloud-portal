import { toast } from '@datum-cloud/datum-ui/toast';
import { useCallback, useEffect, useRef, useState } from 'react';

/** How long a copy confirmation (or failure) stays on screen. */
export const COPY_FEEDBACK_MS = 2000;

interface CopyOptions {
  withToast?: boolean;
  toastMessage?: string;
}

type CopyFn = (text: string, options?: CopyOptions) => Promise<boolean>;

export function useCopyToClipboard(): [boolean, CopyFn, (value: string) => boolean] {
  const [copiedText, setCopiedText] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy: CopyFn = useCallback(async (text, options) => {
    if (!navigator?.clipboard) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);

      if (options?.withToast) {
        toast.success(options.toastMessage ?? 'Copied to clipboard');
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCopiedText('');
      }, COPY_FEEDBACK_MS);

      return true;
    } catch {
      setCopiedText('');
      return false;
    }
  }, []);

  const isCopiedValue = useCallback((value: string) => copiedText === value, [copiedText]);

  return [copiedText !== '', copy, isCopiedValue];
}
