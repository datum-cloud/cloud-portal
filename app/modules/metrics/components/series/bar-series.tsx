import { Bar } from 'recharts';

export function BarSeries({
  series,
  stackId,
  barSize,
}: {
  series: { name: string; color: string };
  stackId?: string;
  barSize?: number;
}) {
  return (
    <Bar
      key={series.name}
      dataKey={series.name}
      stackId={stackId}
      fill={series.color}
      radius={stackId ? 0 : 4}
      barSize={barSize}
      isAnimationActive={false}
    />
  );
}
