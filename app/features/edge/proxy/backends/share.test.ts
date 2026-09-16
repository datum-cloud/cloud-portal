import { backendShares, formatSharePercent } from './share';
import type { ProxyBackend } from '@/resources/http-proxies';
import { describe, expect, it } from 'bun:test';

function backend(weight: number, endpoint = `https://${weight}.example.com`): ProxyBackend {
  return { key: `0:${weight}`, kind: 'endpoint', endpoint, weight, editable: true };
}

describe('backendShares', () => {
  it('splits by weight over the sum of weights', () => {
    const { shares, totalWeight, noTraffic } = backendShares([
      backend(50),
      backend(30),
      backend(20),
    ]);

    expect(totalWeight).toBe(100);
    expect(noTraffic).toBe(false);
    expect(shares.map((s) => s.percent)).toEqual([50, 30, 20]);
  });

  it('normalizes weights that do not add up to 100', () => {
    // Weight is a ratio, not a percentage — 1 and 3 is a 25/75 split.
    const { shares } = backendShares([backend(1), backend(3)]);
    expect(shares.map((s) => s.percent)).toEqual([25, 75]);
  });

  it('gives a single backend everything', () => {
    const { shares } = backendShares([backend(7)]);
    expect(shares[0].percent).toBe(100);
    expect(shares[0].excluded).toBe(false);
  });

  it('excludes a zero-weight backend but keeps it listed', () => {
    const { shares, noTraffic } = backendShares([backend(50), backend(0)]);

    expect(noTraffic).toBe(false);
    expect(shares[0].percent).toBe(100);
    expect(shares[1].percent).toBe(0);
    expect(shares[1].excluded).toBe(true);
  });

  it('reports no traffic when every weight is zero, rather than dividing by it', () => {
    const { shares, totalWeight, noTraffic } = backendShares([backend(0), backend(0)]);

    expect(noTraffic).toBe(true);
    expect(totalWeight).toBe(0);
    expect(shares.every((s) => s.percent === 0 && s.excluded)).toBe(true);
    expect(shares.every((s) => Number.isFinite(s.percent))).toBe(true);
  });

  it('handles an empty pool', () => {
    const { shares, noTraffic } = backendShares([]);
    expect(shares).toEqual([]);
    expect(noTraffic).toBe(true);
  });

  it('cycles colors so a pool larger than the palette still renders', () => {
    const { shares } = backendShares(Array.from({ length: 7 }, (_, i) => backend(i + 1)));
    expect(shares[5].color).toBe(shares[0].color);
    expect(shares[6].color).toBe(shares[1].color);
  });
});

describe('formatSharePercent', () => {
  it('rounds to whole numbers', () => {
    expect(formatSharePercent(33.333)).toBe('33%');
    expect(formatSharePercent(66.667)).toBe('67%');
  });

  it('distinguishes a tiny share from none at all', () => {
    // A backend at weight 1 against 1000 still takes traffic; "0%" would read
    // as drained, which is a different operational state.
    expect(formatSharePercent(0.0999)).toBe('<1%');
    expect(formatSharePercent(0)).toBe('0%');
  });
});
