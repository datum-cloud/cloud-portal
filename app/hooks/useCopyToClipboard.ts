import { toast } from '@datum-ui/components';
import { useCallback, useEffect, useRef, useState } from 'react';

interface CopyOptions {
  withToast?: boolean;
  toastMessage?: string;
}

type CopyFn = (text: string, options?: CopyOptions) => Promise<boolean>;

export function useCopyToClipboard(): [boolean, CopyFn] {
  const [isCopied, setIsCopied] = useState(false);
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
      setIsCopied(true);

      if (options?.withToast) {
        toast.success(options.toastMessage ?? 'Copied to clipboard');
      }

      timeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, 2000);

      return true;
    } catch {
      setIsCopied(false);
      return false;
    }
  }, []);

  return [isCopied, copy];
}
