import { Line } from 'recharts';

export function LineSeries({ series }: { series: { name: string; color: string } }) {
  return (
    <Line
      key={series.name}
      dataKey={series.name}
      stroke={series.color}
      strokeWidth={2}
      dot={false}
    />
  );
}
