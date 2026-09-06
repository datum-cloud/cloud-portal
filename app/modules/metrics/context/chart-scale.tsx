import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface ChartScaleContextValue {
  max: number;
  report: (id: string, max: number) => void;
}

const ChartScaleContext = createContext<ChartScaleContextValue | null>(null);

/** Shared Y-axis max for a group of count charts (e.g. WAF events). */
export function ChartScaleGroup({ children }: { children: ReactNode }) {
  const [maxes, setMaxes] = useState<Record<string, number>>({});

  const report = useCallback((id: string, max: number) => {
    setMaxes((prev) => (prev[id] === max ? prev : { ...prev, [id]: max }));
  }, []);

  const max = useMemo(() => Math.max(0, ...Object.values(maxes)), [maxes]);

  const value = useMemo(() => ({ max, report }), [max, report]);

  return <ChartScaleContext.Provider value={value}>{children}</ChartScaleContext.Provider>;
}

export function useChartScale(id: string | null, localMax: number): number {
  const ctx = useContext(ChartScaleContext);

  useEffect(() => {
    if (!id || !ctx) return;
    ctx.report(id, localMax);
  }, [ctx, id, localMax]);

  if (!id || !ctx) return localMax;
  return Math.max(ctx.max, localMax);
}
