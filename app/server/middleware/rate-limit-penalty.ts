import type { RedisLike } from './rate-limit-store';
import { logger } from '@/modules/logger';

/** Ceiling trips within the window that put a subject in the penalty box. */
export const PENALTY_TRIPS = 3;
/** Window in which trips accumulate. */
export const PENALTY_TRIP_WINDOW_SEC = 600;
/** How long a penalised subject is rejected on every /api request. */
export const PENALTY_DURATION_SEC = 900;

const tripsKey = (sub: string) => `ratelimit:trips:${sub}`;
const penaltyKey = (sub: string) => `ratelimit:penalty:${sub}`;

/**
 * A human never trips the ceiling; a script does, repeatedly. The penalty box
 * turns the ceiling from a speed bump into a stop.
 */
export interface PenaltyBox {
  /** Records a ceiling trip. Resolves true when this trip started a penalty. */
  recordTrip(sub: string): Promise<boolean>;
  /** Remaining penalty in whole seconds, 0 when the subject is not penalised. */
  remaining(sub: string): Promise<number>;
}

export function createMemoryPenaltyBox(now: () => number = () => Date.now()): PenaltyBox {
  const trips = new Map<string, { count: number; expiresAt: number }>();
  const penalties = new Map<string, number>();

  return {
    async recordTrip(sub) {
      const current = trips.get(sub);
      const entry =
        current && current.expiresAt > now()
          ? { count: current.count + 1, expiresAt: current.expiresAt }
          : { count: 1, expiresAt: now() + PENALTY_TRIP_WINDOW_SEC * 1000 };
      if (entry.count < PENALTY_TRIPS) {
        trips.set(sub, entry);
        return false;
      }
      trips.delete(sub);
      penalties.set(sub, now() + PENALTY_DURATION_SEC * 1000);
      return true;
    },
    async remaining(sub) {
      const until = penalties.get(sub);
      if (!until) return 0;
      const left = Math.ceil((until - now()) / 1000);
      if (left <= 0) {
        penalties.delete(sub);
        return 0;
      }
      return left;
    },
  };
}

export function createRedisPenaltyBox(
  redis: RedisLike,
  fallback: PenaltyBox = createMemoryPenaltyBox()
): PenaltyBox {
  let warned = false;
  const onRedisError = (error: unknown) => {
    if (warned) return;
    warned = true;
    logger.warn('[rate-limit] Redis unavailable for the penalty box, using memory', {
      error: error instanceof Error ? error.message : String(error),
    });
  };

  return {
    async recordTrip(sub) {
      if (redis.status !== 'ready') return fallback.recordTrip(sub);
      try {
        const count = Number(await redis.call('INCR', tripsKey(sub)));
        // Arm the window on the first trip, and re-arm it if an earlier EXPIRE
        // never landed (TTL -1): a trips key that never expires would penalise
        // a subject after three trips ever, not three within the window.
        if (count === 1 || Number(await redis.call('TTL', tripsKey(sub))) === -1) {
          await redis.call('EXPIRE', tripsKey(sub), PENALTY_TRIP_WINDOW_SEC);
        }
        if (count < PENALTY_TRIPS) return false;
        await redis.call('SET', penaltyKey(sub), '1', 'EX', PENALTY_DURATION_SEC);
        await redis.call('DEL', tripsKey(sub));
        warned = false;
        return true;
      } catch (error) {
        onRedisError(error);
        return fallback.recordTrip(sub);
      }
    },
    async remaining(sub) {
      if (redis.status !== 'ready') return fallback.remaining(sub);
      try {
        const ttl = Number(await redis.call('TTL', penaltyKey(sub)));
        warned = false;
        return ttl > 0 ? ttl : 0;
      } catch (error) {
        onRedisError(error);
        return fallback.remaining(sub);
      }
    },
  };
}
