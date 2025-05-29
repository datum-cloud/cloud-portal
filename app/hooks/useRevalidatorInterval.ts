import { useEffect, useRef } from 'react';
import { useRevalidator } from 'react-router';

interface Options {
  enabled?: boolean;
  interval?: number;
}

export function useRevalidateOnInterval({ enabled = false, interval = 1000 }: Options) {
  const revalidate = useRevalidator();
  const intervalRef = useRef<NodeJS.Timeout>(null);

  useEffect(
    function revalidateOnInterval() {
      if (!enabled) return;
      intervalRef.current = setInterval(() => revalidate.revalidate(), interval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    },
    [revalidate, interval, enabled]
  );

  return {
    clear: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    },
    revalidate: revalidate.revalidate,
  };
}
