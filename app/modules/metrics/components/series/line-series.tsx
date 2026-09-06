import { Line } from 'recharts';

export function LineSeries({
  series,
  showDots = false,
  hide = false,
}: {
  series: { name: string; color: string };
  showDots?: boolean;
  hide?: boolean;
}) {
  return (
    <Line
      dataKey={series.name}
      name={series.name}
      hide={hide}
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
