import { Area } from 'recharts';

export function AreaSeries({
  series,
  gradientId,
}: {
  series: { name: string; color: string };
  gradientId?: string;
}) {
  return (
    <Area
      key={series.name}
      dataKey={series.name}
      type="monotone"
      fill={gradientId ? `url(#${gradientId})` : series.color}
      fillOpacity={gradientId ? 1 : 0.3}
      stroke={series.color}
      strokeWidth={1.5}
    />
  );
}
