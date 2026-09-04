export const TOOLTIP_WIDTH_PX = 176;
export const TOOLTIP_HEIGHT_PX = 92;
export const TOOLTIP_GAP_PX = 10;
export const TOOLTIP_EDGE_PADDING_PX = 8;
const TOOLTIP_COLLISION_PADDING_PX = 6;

export type TooltipAnchor = {
  value: string;
  x: number;
  y: number;
};

export type TooltipLayout = TooltipAnchor & {
  offsetX: number;
  offsetY: number;
};

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type LayoutRect = TooltipAnchor & Rect;

function defaultTooltipRect(
  anchorX: number,
  anchorY: number,
  containerWidth: number,
  containerHeight: number
): Rect {
  const anchorPxX = (anchorX / 100) * containerWidth;
  const anchorPxY = (anchorY / 100) * containerHeight;
  const flipX = anchorX > 32;
  const flipY = anchorY > 70;
  return {
    left: anchorPxX + (flipX ? -TOOLTIP_WIDTH_PX - TOOLTIP_GAP_PX : TOOLTIP_GAP_PX),
    top: anchorPxY + (flipY ? -TOOLTIP_HEIGHT_PX - TOOLTIP_GAP_PX : TOOLTIP_GAP_PX),
    width: TOOLTIP_WIDTH_PX,
    height: TOOLTIP_HEIGHT_PX,
  };
}

function rectsOverlap(a: Rect, b: Rect, padding = TOOLTIP_COLLISION_PADDING_PX): boolean {
  return !(
    a.left + a.width + padding <= b.left ||
    b.left + b.width + padding <= a.left ||
    a.top + a.height + padding <= b.top ||
    b.top + b.height + padding <= a.top
  );
}

function clampRect(rect: LayoutRect, containerWidth: number, containerHeight: number) {
  const maxLeft = containerWidth - rect.width - TOOLTIP_EDGE_PADDING_PX;
  const maxTop = containerHeight - rect.height - TOOLTIP_EDGE_PADDING_PX;
  rect.left = Math.min(
    Math.max(rect.left, TOOLTIP_EDGE_PADDING_PX),
    Math.max(TOOLTIP_EDGE_PADDING_PX, maxLeft)
  );
  rect.top = Math.min(
    Math.max(rect.top, TOOLTIP_EDGE_PADDING_PX),
    Math.max(TOOLTIP_EDGE_PADDING_PX, maxTop)
  );
}

function separate(a: LayoutRect, b: LayoutRect) {
  const padding = TOOLTIP_COLLISION_PADDING_PX;
  const overlapX =
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left) + padding;
  const overlapY = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top) + padding;
  if (overlapX <= 0 || overlapY <= 0) return;

  if (overlapX < overlapY) {
    const push = overlapX / 2;
    const dir = a.left + a.width / 2 <= b.left + b.width / 2 ? -1 : 1;
    a.left += push * dir;
    b.left -= push * dir;
  } else {
    const push = overlapY / 2;
    const dir = a.top + a.height / 2 <= b.top + b.height / 2 ? -1 : 1;
    a.top += push * dir;
    b.top -= push * dir;
  }
}

function resolveCollisions(rects: LayoutRect[], containerWidth: number, containerHeight: number) {
  for (let pass = 0; pass < 24; pass++) {
    let moved = false;
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (rectsOverlap(rects[i], rects[j])) {
          separate(rects[i], rects[j]);
          moved = true;
        }
      }
    }
    for (const rect of rects) clampRect(rect, containerWidth, containerHeight);
    if (!moved) break;
  }
}

function placementCandidates(
  anchor: TooltipAnchor,
  containerWidth: number,
  containerHeight: number
): Rect[] {
  const anchorPxX = (anchor.x / 100) * containerWidth;
  const anchorPxY = (anchor.y / 100) * containerHeight;
  const placements: Rect[] = [];
  const dirs = [
    { dx: TOOLTIP_GAP_PX, dy: TOOLTIP_GAP_PX },
    { dx: -TOOLTIP_WIDTH_PX - TOOLTIP_GAP_PX, dy: TOOLTIP_GAP_PX },
    { dx: TOOLTIP_GAP_PX, dy: -TOOLTIP_HEIGHT_PX - TOOLTIP_GAP_PX },
    { dx: -TOOLTIP_WIDTH_PX - TOOLTIP_GAP_PX, dy: -TOOLTIP_HEIGHT_PX - TOOLTIP_GAP_PX },
    { dx: TOOLTIP_GAP_PX, dy: -TOOLTIP_HEIGHT_PX - TOOLTIP_GAP_PX - 24 },
    { dx: -TOOLTIP_WIDTH_PX - TOOLTIP_GAP_PX, dy: -TOOLTIP_HEIGHT_PX - TOOLTIP_GAP_PX - 24 },
    { dx: TOOLTIP_GAP_PX, dy: TOOLTIP_HEIGHT_PX + TOOLTIP_GAP_PX },
    { dx: -TOOLTIP_WIDTH_PX - TOOLTIP_GAP_PX, dy: TOOLTIP_HEIGHT_PX + TOOLTIP_GAP_PX },
  ];

  for (const dir of dirs) {
    placements.push({
      left: anchorPxX + dir.dx,
      top: anchorPxY + dir.dy,
      width: TOOLTIP_WIDTH_PX,
      height: TOOLTIP_HEIGHT_PX,
    });
  }

  const preferred = defaultTooltipRect(anchor.x, anchor.y, containerWidth, containerHeight);
  return [
    preferred,
    ...placements.filter((rect) => rect.left !== preferred.left || rect.top !== preferred.top),
  ];
}

function scorePlacement(
  rect: LayoutRect,
  placed: LayoutRect[],
  anchor: TooltipAnchor,
  containerWidth: number,
  containerHeight: number
) {
  let score = 0;
  for (const other of placed) {
    if (rectsOverlap(rect, other, 0)) score += 1000;
  }
  const base = defaultTooltipRect(anchor.x, anchor.y, containerWidth, containerHeight);
  if (rect.left !== base.left || rect.top !== base.top) score += 40;
  return score;
}

export function layoutPersistentTooltips(
  anchors: TooltipAnchor[],
  containerWidth: number,
  containerHeight: number
): TooltipLayout[] {
  if (containerWidth <= 0 || containerHeight <= 0 || anchors.length === 0) return [];

  const sorted = [...anchors].sort(
    (a, b) => a.y - b.y || a.x - b.x || a.value.localeCompare(b.value)
  );
  const placed: LayoutRect[] = [];

  for (const anchor of sorted) {
    const candidates = placementCandidates(anchor, containerWidth, containerHeight).map((rect) => ({
      ...anchor,
      ...rect,
    }));

    let best = candidates[0];
    let bestScore = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const clamped = { ...candidate };
      clampRect(clamped, containerWidth, containerHeight);
      const score = scorePlacement(clamped, placed, anchor, containerWidth, containerHeight);
      if (score < bestScore) {
        bestScore = score;
        best = clamped;
      }
    }

    placed.push(best);
  }

  resolveCollisions(placed, containerWidth, containerHeight);

  return placed.map((rect) => {
    const base = defaultTooltipRect(rect.x, rect.y, containerWidth, containerHeight);
    return {
      value: rect.value,
      x: rect.x,
      y: rect.y,
      offsetX: rect.left - base.left,
      offsetY: rect.top - base.top,
    };
  });
}
