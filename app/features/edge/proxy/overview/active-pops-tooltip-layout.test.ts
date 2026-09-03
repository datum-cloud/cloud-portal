import {
  TOOLTIP_HEIGHT_PX,
  TOOLTIP_WIDTH_PX,
  layoutPersistentTooltips,
} from './active-pops-tooltip-layout';
import { describe, expect, it } from 'bun:test';

function tooltipRect(
  layout: { x: number; y: number; offsetX: number; offsetY: number },
  containerWidth: number,
  containerHeight: number
) {
  const flipX = layout.x > 32;
  const flipY = layout.y > 70;
  const anchorX = (layout.x / 100) * containerWidth;
  const anchorY = (layout.y / 100) * containerHeight;
  const left =
    anchorX +
    (flipX ? -TOOLTIP_WIDTH_PX - 10 : 10) +
    layout.offsetX;
  const top =
    anchorY +
    (flipY ? -TOOLTIP_HEIGHT_PX - 10 : 10) +
    layout.offsetY;
  return { left, top, width: TOOLTIP_WIDTH_PX, height: TOOLTIP_HEIGHT_PX };
}

function overlaps(
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number }
) {
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );
}

describe('layoutPersistentTooltips', () => {
  it('keeps a single tooltip near its default offset', () => {
    const [layout] = layoutPersistentTooltips([{ value: 'a', x: 50, y: 50 }], 800, 600);
    expect(Math.abs(layout.offsetX)).toBeLessThan(4);
    expect(Math.abs(layout.offsetY)).toBeLessThan(4);
  });

  it('separates overlapping tooltips for nearby markers', () => {
    const layouts = layoutPersistentTooltips(
      [
        { value: 'a', x: 50, y: 50 },
        { value: 'b', x: 52, y: 51 },
        { value: 'c', x: 49, y: 52 },
      ],
      900,
      700
    );
    const rects = layouts.map((layout) => tooltipRect(layout, 900, 700));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(overlaps(rects[i], rects[j])).toBe(false);
      }
    }
  });
});
