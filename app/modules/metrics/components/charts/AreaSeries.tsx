import { Area } from 'recharts';

export function AreaSeries({ series }: { series: { name: string; color: string } }) {
  return (
    <Area
      key={series.name}
      dataKey={series.name}
      type="monotone"
      fill={series.color}
      fillOpacity={0.3}
      stroke={series.color}
    />
  );
}
