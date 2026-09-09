import {
  nextHiddenSeries,
  type SeriesLegendModifiers,
} from '@/modules/metrics/utils/series-visibility';
import type { ChartSeries } from '@/modules/prometheus';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ChartLegendContextValue = {
  series: ChartSeries[];
  setSeries: (series: ChartSeries[]) => void;
  hidden: ReadonlySet<string>;
  onLegendClick: (name: string, modifiers: SeriesLegendModifiers) => void;
};

const ChartLegendContext = createContext<ChartLegendContextValue | null>(null);

function sameSeries(left: ChartSeries[], right: ChartSeries[]) {
  return (
    left.length === right.length &&
    left.every(
      (item, index) => item.name === right[index]?.name && item.color === right[index]?.color
    )
  );
}

export function ChartLegendProvider({ children }: { children: ReactNode }) {
  const [series, setSeriesState] = useState<ChartSeries[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  const setSeries = useCallback((next: ChartSeries[]) => {
    setSeriesState((prev) => (sameSeries(prev, next) ? prev : next));
  }, []);

  const names = useMemo(() => series.map((item) => item.name), [series]);

  useEffect(() => {
    setHidden((prev) => {
      const next = new Set<string>();
      for (const name of prev) {
        if (names.includes(name)) next.add(name);
      }
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [names]);

  const onLegendClick = useCallback(
    (name: string, modifiers: SeriesLegendModifiers) => {
      setHidden((prev) => nextHiddenSeries(names, prev, name, modifiers));
    },
    [names]
  );

  const value = useMemo(
    () => ({ series, setSeries, hidden, onLegendClick }),
    [series, setSeries, hidden, onLegendClick]
  );

  return <ChartLegendContext.Provider value={value}>{children}</ChartLegendContext.Provider>;
}

export function useOptionalChartLegend() {
  return useContext(ChartLegendContext);
}
