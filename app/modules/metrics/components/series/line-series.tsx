import { Line } from 'recharts';

export function LineSeries({
  series,
  showDots = false,
}: {
  series: { name: string; color: string };
  showDots?: boolean;
}) {
  return (
    <Line
      dataKey={series.name}
      name={series.name}
      type="linear"
      stroke={series.color}
      strokeWidth={2}
      connectNulls={false}
      dot={
        showDots ? { r: 3, fill: series.color, stroke: 'var(--background)', strokeWidth: 1 } : false
      }
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
