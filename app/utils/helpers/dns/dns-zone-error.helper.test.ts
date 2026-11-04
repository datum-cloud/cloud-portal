import { isDnsZoneErrored } from './dns-zone-error.helper';
import { describe, expect, it } from 'vitest';

describe('isDnsZoneErrored', () => {
  it('flags Programmed=False with a reason', () => {
    expect(isDnsZoneErrored({ isProgrammed: false, programmedReason: 'PDNSError' } as never)).toBe(
      true
    );
  });

  it('does not flag a private zone still waiting on a serving replica', () => {
    expect(
      isDnsZoneErrored({
        isProgrammed: false,
        programmedReason: 'PendingReplicaApplication',
      } as never)
    ).toBe(false);
  });

  it('does not flag programmed zones or a missing reason', () => {
    expect(isDnsZoneErrored({ isProgrammed: true, programmedReason: 'Programmed' } as never)).toBe(
      false
    );
    expect(isDnsZoneErrored({ isProgrammed: false } as never)).toBe(false);
  });
});
