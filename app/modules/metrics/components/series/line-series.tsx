import { Line } from 'recharts';

export function LineSeries({ series }: { series: { name: string; color: string } }) {
  return (
    <Line
      key={series.name}
      dataKey={series.name}
      type="monotone"
      stroke={series.color}
      strokeWidth={2}
      dot={false}
      activeDot={{
        r: 4,
        fill: series.color,
        stroke: 'var(--background)',
        strokeWidth: 1.5,
      }}
      isAnimationActive={false}
    />
  );
}
