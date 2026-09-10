import { Bar, Rectangle } from 'recharts';

const TOP_RADIUS: [number, number, number, number] = [3, 3, 0, 0];

type BarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: Record<string, unknown>;
};

function hasSeriesAbove(
  payload: Record<string, unknown> | undefined,
  seriesKeys: string[],
  dataKey: string
): boolean {
  const index = seriesKeys.indexOf(dataKey);
  if (index < 0) return false;
  return seriesKeys.slice(index + 1).some((key) => {
    const value = payload?.[key];
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  });
}

export function BarSeries({
  series,
  stackId,
  seriesKeys,
  hide = false,
}: {
  series: { name: string; color: string };
  stackId?: string;
  seriesKeys?: string[];
  hide?: boolean;
}) {
  const stacked = Boolean(stackId && seriesKeys?.length);

  return (
    <Bar
      dataKey={series.name}
      name={series.name}
      stackId={stackId}
      hide={hide}
      fill={series.color}
      radius={stacked ? 0 : TOP_RADIUS}
      maxBarSize={48}
      isAnimationActive={false}
      shape={
        stacked
          ? (props: BarShapeProps) =>
              !props.height ? null : (
                <Rectangle
                  x={props.x}
                  y={props.y}
                  width={props.width}
                  height={props.height}
                  fill={props.fill}
                  radius={
                    hasSeriesAbove(props.payload, seriesKeys ?? [], series.name) ? 0 : TOP_RADIUS
                  }
                  isAnimationActive={false}
                />
              )
          : undefined
      }
    />
  );
}
