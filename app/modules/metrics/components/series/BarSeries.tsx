import { Bar } from 'recharts';

export function BarSeries({ series }: { series: { name: string; color: string } }) {
  return <Bar key={series.name} dataKey={series.name} fill={series.color} radius={4} />;
}
