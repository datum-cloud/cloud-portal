import { DEFAULT_TIME_RANGE } from '@/modules/metrics/constants';

export type ChartMouseState = {
  activeLabel?: string | number;
  activeTooltipIndex?: number;
  activePayload?: Array<{ payload?: { timestamp?: number } }>;
};

export function timestampFromChartEvent(state: ChartMouseState | null | undefined): number | null {
  const fromPayload = state?.activePayload?.[0]?.payload?.timestamp;
  if (typeof fromPayload === 'number' && Number.isFinite(fromPayload)) return fromPayload;

  const label = state?.activeLabel;
  const fromLabel = typeof label === 'number' ? label : Number(label);
  return Number.isFinite(fromLabel) ? fromLabel : null;
}

export function resolveBrushTimeRange(
  startMs: number,
  endMs: number,
  options: { stepMs: number; rangeStart: number; rangeEnd: number }
): { start: Date; end: Date } | null {
  const left = Math.min(startMs, endMs);
  const right = Math.max(startMs, endMs);
  if (right === left) return null;

  const start = Math.max(options.rangeStart, left);
  const end = Math.min(options.rangeEnd, right + options.stepMs);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < options.stepMs) {
    return null;
  }
  return { start: new Date(start), end: new Date(end) };
}

let zoomOrigin: string | null = null;

export function rememberZoomOrigin(currentUrl: string | null | undefined) {
  const value = currentUrl || DEFAULT_TIME_RANGE;
  if (!zoomOrigin && !/^\d+_\d+$/.test(value)) {
    zoomOrigin = value;
  }
}

export function consumeZoomOrigin(): string | null {
  const origin = zoomOrigin;
  zoomOrigin = null;
  return origin;
}

export function clearZoomOriginIfPreset(currentUrl: string | null | undefined) {
  if (currentUrl?.startsWith('now-')) {
    zoomOrigin = null;
  }
}
