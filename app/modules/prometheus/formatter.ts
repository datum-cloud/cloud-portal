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

const DEFAULT_TIME_RANGE_MS = 3600000; // 1 hour in milliseconds

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
    timeRange: timeRange || { start: now - DEFAULT_TIME_RANGE_MS, end: now }, // Default 1 hour range
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
    timeRange: timeRange || { start: now - DEFAULT_TIME_RANGE_MS, end: now },
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
  /* const priorityLabels = ['instance', 'job', 'service', 'pod', 'container', 'node'];

  for (const label of priorityLabels) {
    if (labels[label]) {
      return labels[label];
    }
  } */

  // If no priority labels, combine all available labels with '-'
  const labelEntries = Object.entries(labels);
  if (labelEntries.length > 0) {
    return labelEntries.map(([_, value]) => value).join(' - ');
  }

  return 'Series';
}

// Pre-calculated constants for performance
const BASE_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#e74c3c',
  '#9b59b6',
  '#1abc9c',
  '#f39c12',
  '#3498db',
  '#2ecc71',
  '#e67e22',
  '#34495e',
] as const;

const GOLDEN_RATIO = 0.618033988749;
const SATURATION_LEVELS = [70, 85, 60, 90, 75] as const;
const LIGHTNESS_LEVELS = [50, 40, 60, 45, 55] as const;

// Memoization cache for generated colors
const colorCache = new Map<number, string>();

/**
 * Generate colors for chart series using optimized dynamic HSL color generation
 * Supports unlimited colors with good visual distinction and performance caching
 */
function generateColor(index: number): string {
  // Check cache first for O(1) lookup
  const cached = colorCache.get(index);
  if (cached) {
    return cached;
  }

  let color: string;

  // Use predefined colors for first 12 series (fastest path)
  if (index < BASE_COLORS.length) {
    color = BASE_COLORS[index];
  } else {
    // Generate dynamic color with pre-calculated constants
    const dynamicIndex = index - BASE_COLORS.length;
    const hue = (dynamicIndex * GOLDEN_RATIO * 360) % 360;
    const saturation = SATURATION_LEVELS[dynamicIndex % SATURATION_LEVELS.length];
    const lightness = LIGHTNESS_LEVELS[dynamicIndex % LIGHTNESS_LEVELS.length];

    color = `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;
  }

  // Cache the result for future use
  colorCache.set(index, color);
  return color;
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
    return { start: now - DEFAULT_TIME_RANGE_MS, end: now }; // Default 1 hour range
  }

  return { start, end };
}

/**
 * Format large numbers with metric suffixes (K, M, G, T, P, E).
 */
function formatShortNumber(num: number, precision: number = 2): string {
  if (num === null || isNaN(num)) return 'N/A';
  if (num === 0) return '0';

  const absNum = Math.abs(num);
  const tier = Math.floor(Math.log10(absNum) / 3);

  if (tier === 0) {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: precision,
    });
  }

  const suffix = ['', 'K', 'M', 'G', 'T', 'P', 'E'][tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = num / scale;

  return `${scaled.toFixed(precision)}${suffix}`;
}

/**
 * Format numeric values based on the specified format type.
 */
export function formatValue(value: number, format: MetricFormat = 'number', precision = 2): string {
  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(precision)}%`;
    case 'percent-hundred':
      return `${value.toFixed(precision)}%`;
    case 'bytes':
      return formatBytes(value, precision);
    case 'seconds':
      return `${value.toFixed(precision)}s`;
    case 'requestsPerSecond':
      return `${value.toFixed(precision)} req/s`;
    case 'milliseconds':
      return `${value.toFixed(precision)} ms`;
    case 'milliseconds-auto':
      if (value >= 1000) {
        return `${(value / 1000).toFixed(precision)}s`;
      }
      return `${value.toFixed(0)}ms`;
    case 'duration':
      return formatDuration(value);
    case 'rate':
      return `${value.toFixed(precision)}/s`;
    case 'short-number':
      return formatShortNumber(value, precision);
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
  if (formattedData.series.length === 0) {
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
