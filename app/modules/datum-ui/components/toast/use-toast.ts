/**
 * Sonner is a toast library for React.
 * Implementation based on github.com/epicweb-dev/epic-stack
 */
import { toast } from './toast';
import type { Toast } from '@/utils/cookies';
import { useEffect } from 'react';

export function useToast(toastData?: Toast | null) {
  useEffect(() => {
    if (toastData) {
      setTimeout(() => {
        toast[toastData.type](toastData.title ?? toastData.description, {
          id: toastData.id,
          description: toastData.title ? toastData.description : undefined,
        });
      }, 0);
    }
  }, [toastData]);
}
