/**
 * Data formatting utilities for Recharts integration
 */
import { ChartDataError } from './errors';
import type {
  PrometheusQueryResult,
  PrometheusMetric,
  ChartDataPoint,
  ChartSeries,
  FormattedMetricData,
  MetricCardData,
  MetricFormat,
} from './types';

/**
 * Format Prometheus response data for Recharts
 */
export function formatForChart(
  queryResult: PrometheusQueryResult,
  timeRange?: { start: number; end: number }
): FormattedMetricData {
  if (!queryResult || !queryResult.result) {
    return {
      series: [],
      timeRange: timeRange || { start: 0, end: 0 },
      isEmpty: true,
    };
  }

  const { resultType, result } = queryResult;

  switch (resultType) {
    case 'matrix':
      return formatMatrixData(result, timeRange);
    case 'vector':
      return formatVectorData(result, timeRange);
    case 'scalar':
      return formatScalarData(result, timeRange);
    default:
      throw new ChartDataError(
        `Unsupported result type: ${resultType}`,
        resultType,
        'matrix, vector, or scalar'
      );
  }
}

/**
 * Format matrix data (time series) for charts
 */
function formatMatrixData(
  result: PrometheusMetric[],
  timeRange?: { start: number; end: number }
): FormattedMetricData {
  const series: ChartSeries[] = result.map((metric, index) => {
    const seriesName = generateSeriesName(metric.metric);
    const data: ChartDataPoint[] = (metric.values || []).map((metricValue) => {
      // metricValue is a tuple [timestamp, value]
      const [timestamp, value] = metricValue;
      const timestampMs = timestamp * 1000;
      let formattedTime: string;

      try {
        // Validate timestamp range (between 1970 and 2100)
        if (timestamp < 0 || timestamp > 4102444800) {
          formattedTime = new Date().toISOString(); // Use current time as fallback
        } else {
          const date = new Date(timestampMs);
          if (isNaN(date.getTime())) {
            formattedTime = new Date().toISOString(); // Use current time as fallback
          } else {
            formattedTime = date.toISOString();
          }
        }
      } catch {
        formattedTime = new Date().toISOString(); // Use current time as fallback
      }

      return {
        timestamp: timestampMs,
        value: parseFloat(value),
        formattedTime,
        labels: metric.metric,
      };
    });

    return {
      name: seriesName,
      data,
      labels: metric.metric,
      color: generateColor(index),
    };
  });

  const calculatedTimeRange = timeRange || calculateTimeRange(series);

  return {
    series,
    timeRange: calculatedTimeRange,
    isEmpty: series.length === 0 || series.every((s) => s.data.length === 0),
  };
}

/**
 * Format vector data (instant values) for charts
 */
function formatVectorData(
  result: PrometheusMetric[],
  timeRange?: { start: number; end: number }
): FormattedMetricData {
  const now = Date.now();
  const series: ChartSeries[] = result.map((metric, index) => {
    const seriesName = generateSeriesName(metric.metric);
    const value = metric.value ? parseFloat(metric.value[1]) : 0;
    const timestamp = metric.value ? metric.value[0] * 1000 : now;

    const data: ChartDataPoint[] = [
      {
        timestamp,
        value,
        formattedTime: new Date(timestamp).toISOString(),
        labels: metric.metric,
      },
    ];

    return {
      name: seriesName,
      data,
      labels: metric.metric,
      color: generateColor(index),
    };
  });

  return {
    series,
    timeRange: timeRange || { start: now - 3600000, end: now }, // Default 1 hour range
    isEmpty: series.length === 0,
  };
}

/**
 * Format scalar data for charts
 */
function formatScalarData(
  result: PrometheusMetric[],
  timeRange?: { start: number; end: number }
): FormattedMetricData {
  const now = Date.now();

  if (result.length === 0) {
    return {
      series: [],
      timeRange: timeRange || { start: now - 3600000, end: now },
      isEmpty: true,
    };
  }

  // For scalar results, we create a single series with one data point
  const metric = result[0];
  const value = metric.value ? parseFloat(metric.value[1]) : 0;
  const timestamp = metric.value ? metric.value[0] * 1000 : now;

  const series: ChartSeries[] = [
    {
      name: 'Value',
      data: [
        {
          timestamp,
          value,
          formattedTime: new Date(timestamp).toISOString(),
        },
      ],
      labels: {},
      color: generateColor(0),
    },
  ];

  return {
    series,
    timeRange: timeRange || { start: now - 3600000, end: now },
    isEmpty: false,
  };
}

/**
 * Format data for metric cards
 */
export function formatForCard(
  queryResult: PrometheusQueryResult,
  format: MetricFormat = 'number'
): MetricCardData {
  if (!queryResult || !queryResult.result || queryResult.result.length === 0) {
    return {
      value: 0,
      formattedValue: formatValue(0, format),
      timestamp: Date.now(),
    };
  }

  const { resultType, result } = queryResult;
  let value = 0;
  let timestamp = Date.now();
  let labels: Record<string, string> = {};

  switch (resultType) {
    case 'vector':
    case 'scalar':
      const metric = result[0];
      if (metric.value) {
        value = parseFloat(metric.value[1]);
        timestamp = metric.value[0] * 1000;
        labels = metric.metric || {};
      }
      break;
    case 'matrix':
      // For matrix data, use the latest value
      const matrixMetric = result[0];
      if (matrixMetric.values && matrixMetric.values.length > 0) {
        const latestValue = matrixMetric.values[matrixMetric.values.length - 1];
        value = parseFloat(latestValue[1]);
        timestamp = latestValue[0] * 1000;
        labels = matrixMetric.metric || {};
      }
      break;
    default:
      throw new ChartDataError(
        `Unsupported result type for card: ${resultType}`,
        resultType,
        'matrix, vector, or scalar'
      );
  }

  return {
    value,
    formattedValue: formatValue(value, format),
    timestamp,
    labels,
  };
}

/**
 * Generate a human-readable series name from metric labels
 */
function generateSeriesName(labels: Record<string, string>): string {
  // Common label priorities for naming
  const priorityLabels = ['instance', 'job', 'service', 'pod', 'container', 'node'];

  for (const label of priorityLabels) {
    if (labels[label]) {
      return labels[label];
    }
  }

  // If no priority labels, use the first available label
  const labelEntries = Object.entries(labels);
  if (labelEntries.length > 0) {
    return labelEntries[0][1];
  }

  return 'Series';
}

/**
 * Generate colors for chart series
 */
function generateColor(index: number): string {
  const colors = [
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300',
    '#00ff00',
    '#0088fe',
    '#00c49f',
    '#ffbb28',
    '#ff8042',
    '#8dd1e1',
  ];
  return colors[index % colors.length];
}

/**
 * Calculate time range from series data
 */
function calculateTimeRange(series: ChartSeries[]): { start: number; end: number } {
  let start = Infinity;
  let end = -Infinity;

  for (const s of series) {
    for (const point of s.data) {
      start = Math.min(start, point.timestamp);
      end = Math.max(end, point.timestamp);
    }
  }

  if (start === Infinity || end === -Infinity) {
    const now = Date.now();
    return { start: now - 3600000, end: now }; // Default 1 hour range
  }

  return { start, end };
}

/**
 * Format numeric values based on format type
 */
export function formatValue(value: number, format: MetricFormat, precision: number = 2): string {
  switch (format) {
    case 'percentage':
      return `${value.toFixed(precision)}%`;
    case 'bytes':
      return formatBytes(value, precision);
    case 'duration':
      return formatDuration(value);
    case 'rate':
      return `${value.toFixed(precision)}/s`;
    case 'number':
    default:
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: precision,
      });
  }
}

/**
 * Format bytes with appropriate units
 */
function formatBytes(bytes: number, precision: number = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(precision))} ${sizes[i]}`;
}

/**
 * Format duration in seconds to human-readable format
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  } else if (seconds < 3600) {
    return `${(seconds / 60).toFixed(1)}m`;
  } else if (seconds < 86400) {
    return `${(seconds / 3600).toFixed(1)}h`;
  } else {
    return `${(seconds / 86400).toFixed(1)}d`;
  }
}

/**
 * Transform data for Recharts components
 */
export function transformForRecharts(formattedData: FormattedMetricData): any[] {
  if (formattedData.isEmpty || formattedData.series.length === 0) {
    return [];
  }

  // For single series, return array of data points
  if (formattedData.series.length === 1) {
    const series = formattedData.series[0];
    return series.data.map((point) => ({
      timestamp: point.timestamp,
      time: point.formattedTime,
      [series.name]: point.value, // Use series name as key instead of 'value'
      ...point.labels,
    }));
  }

  // For multiple series, merge data points by timestamp
  const timestampMap = new Map<number, any>();

  formattedData.series.forEach((series) => {
    series.data.forEach((point) => {
      const existing = timestampMap.get(point.timestamp) || {
        timestamp: point.timestamp,
        time: point.formattedTime,
      };
      existing[series.name] = point.value;
      timestampMap.set(point.timestamp, existing);
    });
  });

  return Array.from(timestampMap.values()).sort((a, b) => a.timestamp - b.timestamp);
}
