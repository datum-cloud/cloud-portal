import { getRefreshCooldownMessage, getRefreshCooldownRemaining } from './refresh-cooldown';
import { describe, expect, it } from 'bun:test';

const NOW = new Date('2024-05-01T12:00:00Z').getTime();

describe('getRefreshCooldownRemaining', () => {
  it('returns 0 with no or invalid previous attempt', () => {
    expect(getRefreshCooldownRemaining(undefined, NOW)).toBe(0);
    expect(getRefreshCooldownRemaining('', NOW)).toBe(0);
    expect(getRefreshCooldownRemaining('not-a-date', NOW)).toBe(0);
  });

  it('counts down from the previous attempt', () => {
    expect(getRefreshCooldownRemaining('2024-05-01T11:58:00Z', NOW)).toBe(180);
  });

  it('returns 0 once 5 minutes have passed', () => {
    expect(getRefreshCooldownRemaining('2024-05-01T11:55:00Z', NOW)).toBe(0);
    expect(getRefreshCooldownRemaining('2024-05-01T11:00:00Z', NOW)).toBe(0);
  });

  it('caps at the full cooldown when the attempt is ahead of the clock', () => {
    expect(getRefreshCooldownRemaining('2024-05-01T12:01:00Z', NOW)).toBe(300);
  });
});

describe('getRefreshCooldownMessage', () => {
  it('rounds up to whole minutes', () => {
    expect(getRefreshCooldownMessage(181)).toBe(
      'Domains can be refreshed once every 5 minutes. Try again in 4 minutes.'
    );
    expect(getRefreshCooldownMessage(60)).toContain('Try again in 1 minute.');
  });

  it('switches to seconds under a minute', () => {
    expect(getRefreshCooldownMessage(42)).toContain('Try again in 42 seconds.');
    expect(getRefreshCooldownMessage(1)).toContain('Try again in 1 second.');
  });
});
