import {
  focusAngles,
  cropUvFromRects,
  globeFocusUv,
  isMarkerInView,
  projectLocation,
} from './active-pops-globe-math';
import { REGION_COORDINATES } from './region-coordinates';
import { describe, expect, it } from 'bun:test';

const LOCATIONS = Object.entries(REGION_COORDINATES);

describe('globeFocusUv', () => {
  it('aims at the middle of the visible globe, not the left rim', () => {
    const canvas = { left: 256, right: 864, top: -112, bottom: 496 };
    const clip = { left: 235, right: 560, top: 0, bottom: 384 };
    const crop = cropUvFromRects(canvas, clip);
    const uv = globeFocusUv(crop, 1);
    expect(uv.x).toBeGreaterThan(0.25);
    expect(uv.x).toBeLessThan(0.45);
    expect(uv.y).toBeCloseTo(0.5, 1);
  });
});

describe('isMarkerInView', () => {
  it('requires a front-facing marker inside the visible crop', () => {
    const crop = { left: 0.35, right: 0.95, top: 0.05, bottom: 0.95 };
    expect(isMarkerInView({ x: 0.5, y: 0.5, front: true }, crop)).toBe(true);
    expect(isMarkerInView({ x: 0.5, y: 0.5, front: false }, crop)).toBe(false);
    expect(isMarkerInView({ x: 0.1, y: 0.5, front: true }, crop)).toBe(false);
  });
});

describe('focusAngles', () => {
  const aspect = 1;

  it('puts each location at the canvas center when that is the target', () => {
    for (const [, [lat, lng]] of LOCATIONS) {
      const { phi, theta } = focusAngles(lat, lng, aspect, 0.5, 0.5);
      const projected = projectLocation(lat, lng, phi, theta, aspect);
      expect(projected.front).toBe(true);
      expect(projected.visible).toBe(true);
      expect(projected.x).toBeCloseTo(0.5, 2);
      expect(projected.y).toBeCloseTo(0.5, 2);
    }
  });

  it('puts every catalog location in the middle of the visible globe', () => {
    const targets = [
      { aspect: 1, x: 0.3, y: 0.5 },
      { aspect: 1.2, x: 0.28, y: 0.5 },
      { aspect: 0.85, x: 0.35, y: 0.48 },
    ];

    for (const target of targets) {
      for (const [, [lat, lng]] of LOCATIONS) {
        const { phi, theta } = focusAngles(lat, lng, target.aspect, target.x, target.y);
        const projected = projectLocation(lat, lng, phi, theta, target.aspect);
        expect(projected.front).toBe(true);
        expect(projected.visible).toBe(true);
        expect(projected.x).toBeCloseTo(target.x, 1);
        // High-latitude cities cannot always hit an exact Y at wide aspects without
        // rolling the globe; keep a loose vertical band instead.
        expect(projected.y).toBeGreaterThan(0.32);
        expect(projected.y).toBeLessThan(0.68);
      }
    }
  });
});
