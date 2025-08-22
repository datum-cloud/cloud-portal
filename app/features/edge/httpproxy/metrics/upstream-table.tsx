import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartDataPoint, ChartSeries } from '@/modules/prometheus';
import { useMemo } from 'react';

export const HttpProxyUpstreamTable = ({ series }: { series: ChartSeries[] }) => {
  // Calculate statistics for each series
  const seriesStats = useMemo(() => {
    if (!series.length) return [];

    return series.map((val) => {
      const seriesValues = val.data
        .map((point: ChartDataPoint) => point.value)
        .filter((value: number) => typeof value === 'number' && !isNaN(value));

      if (seriesValues.length === 0) {
        return {
          region: val.name,
          last: 0,
          mean: 0,
          max: 0,
        };
      }

      const last = seriesValues[seriesValues.length - 1] || 0;
      const mean =
        seriesValues.reduce((sum: number, val: number) => sum + val, 0) / seriesValues.length;
      const max = Math.max(...seriesValues);

      return {
        region: (
          <>
            <div className="flex items-center gap-1">
              <div
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: val.color,
                  borderColor: val.color,
                }}></div>
              <span className="font-medium">{val.name}</span>
            </div>
          </>
        ),
        last: Number(last.toFixed(6)),
        mean: Number(mean.toFixed(6)),
        max: Number(max.toFixed(6)),
      };
    });
  }, [series]);

  return (
    <div className="scroll- scrollbar-hide mx-4 max-h-64 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader className="bg-background sticky top-0">
          <TableRow>
            <TableHead className="w-1/2">Region</TableHead>
            <TableHead className="w-1/6 text-right">Last</TableHead>
            <TableHead className="w-1/6 text-right">Mean</TableHead>
            <TableHead className="w-1/6 text-right">Max</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seriesStats.map((stat, index) => (
            <TableRow key={index} className="hover:bg-muted/50">
              <TableCell className="font-medium">{stat.region}</TableCell>
              <TableCell className="text-right font-mono text-sm">{stat.last} req/s</TableCell>
              <TableCell className="text-right font-mono text-sm">{stat.mean} req/s</TableCell>
              <TableCell className="text-right font-mono text-sm">{stat.max} req/s</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
