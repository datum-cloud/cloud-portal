import { PrometheusError } from '@/modules/prometheus';

const FALLBACK = "Couldn't load this chart. Try refreshing or changing the time range.";

const INTERNAL_MESSAGE =
  /first argument must be an error|capturestacktrace|api request failed|unexpected token|undefined is not|cannot read propert|is not a function|network error|failed to fetch|econnreset|enotfound|socket hang up/i;

function isInternalMessage(message: string): boolean {
  return !message.trim() || message.length > 160 || INTERNAL_MESSAGE.test(message);
}

export function formatMetricError(error: PrometheusError | Error | null | undefined): string {
  if (!error) return FALLBACK;

  const status = 'statusCode' in error ? error.statusCode : undefined;
  if (status === 401 || status === 403) {
    return "You don't have permission to view these metrics";
  }

  const type = 'type' in error ? error.type : undefined;
  if (type === 'timeout' || status === 504 || status === 408) {
    return 'This chart took too long to load. Try a shorter time range.';
  }
  if (type === 'query') {
    return "Couldn't calculate this chart for the current filters.";
  }
  if (type === 'network' || (status != null && status >= 500)) {
    return "Couldn't load this chart. Try again in a moment.";
  }

  if (isInternalMessage(error.message)) return FALLBACK;
  return error.message;
}
