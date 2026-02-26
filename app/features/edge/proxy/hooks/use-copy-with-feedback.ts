import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { toast } from '@datum-ui/components';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useCopyWithFeedback() {
  const [_, copy] = useCopyToClipboard();
  const [copiedText, setCopiedText] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const copyToClipboard = useCallback(
    (value: string) => {
      if (!value) return;

      copy(value).then(() => {
        setCopiedText(value);
        toast.success('Copied to clipboard');
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setCopiedText('');
        }, 2000);
      });
    },
    [copy]
  );

  const isCopied = useCallback((value: string) => copiedText === value, [copiedText]);

  return { copyToClipboard, isCopied };
}
