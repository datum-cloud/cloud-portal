import { Area } from 'recharts';

export function AreaSeries({
  series,
  gradientId,
  stackId,
  hide = false,
}: {
  series: { name: string; color: string };
  gradientId?: string;
  stackId?: string;
  hide?: boolean;
}) {
  return (
    <Area
      dataKey={series.name}
      name={series.name}
      hide={hide}
      type="monotone"
      fill={gradientId ? `url(#${gradientId})` : series.color}
      fillOpacity={gradientId ? 1 : 0.3}
      stroke={series.color}
      strokeWidth={2}
      stackId={stackId}
      connectNulls={false}
      dot={false}
      isAnimationActive={false}
    />
  );
}
