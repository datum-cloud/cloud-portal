// Parses the WatchHub's SSE stream; unknown or malformed messages are dropped here.
import type { ResyncPayload, ResyncReason, WatchEventType } from './watch.types';

export type HubMessage =
  | { event: 'connected' }
  | { event: 'watch'; channel: string; type: WatchEventType; object: unknown }
  | { event: 'watch-error'; channel: string; payload: Record<string, unknown> }
  | { event: 'resync'; channel: string; payload: ResyncPayload }
  | { event: 'reconnect' }
  | { event: 'subscribe-failed'; channel: string }
  | { event: 'subscribed'; channel: string }
  | { event: 'heartbeat' };

const OBJECT_EVENT_TYPES: ReadonlySet<string> = new Set<WatchEventType>([
  'ADDED',
  'MODIFIED',
  'DELETED',
  'BOOKMARK',
]);

const RESYNC_REASONS: ReadonlySet<string> = new Set<ResyncReason>([
  'reconnect',
  'visible',
  'online',
  'joined',
  'expired',
  'degraded',
  'recovered',
  'auth',
  'error',
]);

export function splitSseFrames(buffer: string): { frames: string[]; rest: string } {
  const frames = buffer.split('\n\n');
  const rest = frames.pop() ?? '';
  return { frames, rest };
}

export function parseSseFrame(raw: string): { event: string; data: string } | null {
  let event = '';
  const dataLines: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('event: ')) {
      event = line.slice(7);
    } else if (line.startsWith('data: ')) {
      dataLines.push(line.slice(6));
    } else if (line === 'data:') {
      dataLines.push('');
    }
  }
  if (!event || dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

type Payload = Record<string, unknown>;

function parseJsonObject(data: string): Payload | null {
  try {
    const parsed: unknown = JSON.parse(data);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Payload)
      : null;
  } catch {
    return null;
  }
}

function channelOf(payload: Payload): string | null {
  return typeof payload.channel === 'string' && payload.channel ? payload.channel : null;
}

function toWatch(channel: string, payload: Payload): HubMessage | null {
  if (typeof payload.type !== 'string' || !OBJECT_EVENT_TYPES.has(payload.type)) return null;
  if (typeof payload.object !== 'object' || payload.object === null) return null;
  return { event: 'watch', channel, type: payload.type as WatchEventType, object: payload.object };
}

function toResync(channel: string, payload: Payload): HubMessage | null {
  if (typeof payload.reason !== 'string' || !RESYNC_REASONS.has(payload.reason)) return null;
  const resync: ResyncPayload = { reason: payload.reason as ResyncReason };
  if (payload.degraded === true) resync.degraded = true;
  return { event: 'resync', channel, payload: resync };
}

const CHANNEL_MESSAGES: Record<string, (channel: string, payload: Payload) => HubMessage | null> = {
  watch: toWatch,
  'watch-error': (channel, payload) => ({ event: 'watch-error', channel, payload }),
  resync: toResync,
  'subscribe-failed': (channel) => ({ event: 'subscribe-failed', channel }),
  subscribed: (channel) => ({ event: 'subscribed', channel }),
};

export function parseHubMessage(raw: string): HubMessage | null {
  const frame = parseSseFrame(raw);
  if (!frame) return null;
  const payload = parseJsonObject(frame.data);
  if (!payload) return null;

  switch (frame.event) {
    case 'connected':
    case 'reconnect':
    case 'heartbeat':
      return { event: frame.event };
  }
  const build = Object.hasOwn(CHANNEL_MESSAGES, frame.event)
    ? CHANNEL_MESSAGES[frame.event]
    : undefined;
  const channel = channelOf(payload);
  if (!build || !channel) return null;
  return build(channel, payload);
}
