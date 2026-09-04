import {
  GLOBE_SCALE,
  MARKER_ELEVATION,
  THETA_MAX,
  THETA_MIN,
  cropUvFromRects,
  focusAngles,
  globeFocusUv,
  isMarkerInView,
  projectLocation,
} from './active-pops-globe-math';
import type { ActivePopMarker } from './active-pops-map';
import {
  ActivePopTooltipCard,
  tooltipFlipTransform,
  tooltipOffsetStyle,
} from './active-pops-tooltip';
import { layoutPersistentTooltips } from './active-pops-tooltip-layout';
import { useTheme } from '@datum-cloud/datum-ui/theme';
import createGlobe, { type Marker } from 'cobe';
import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  variant?: 'card' | 'expanded';
  regionsWithCoords: ActivePopMarker[];
  hoveredRegion?: string | null;
  onHoverRegion?: (value: string | null) => void;
  onFocusRegion?: (value: string) => void;
  focusRegion?: string | null;
  focusToken?: number;
  initialPhi?: number;
  initialTheta?: number;
  onRotationChange?: (phi: number, theta: number) => void;
  persistentActiveTooltips?: boolean;
  suspended?: boolean;
  searching?: boolean;
}

const MARKER_COLOR_LIGHT: [number, number, number] = [0.702, 0.835, 0.435]; // #B3D56F
const MARKER_COLOR_DARK: [number, number, number] = [0.82, 0.94, 0.58];
const IDLE_MARKER_COLOR_LIGHT: [number, number, number] = [0.55, 0.6, 0.57];
const IDLE_MARKER_COLOR_DARK: [number, number, number] = [0.82, 0.86, 0.9];
const MARKER_SIZE = 0.045;
const IDLE_MARKER_SIZE = 0.028;
const MARKER_SIZE_HOVER = 0.07;
// Globe canvas sits off the right edge; start with the Americas in the visible crop.
const INITIAL_PHI = -1.03;
const INITIAL_THETA = 0.34;
const DRAG_PHI_PER_PX = 0.005;
const DRAG_THETA_PER_PX = 0.0035;
const DRAG_SLOP_PX = 4;

const LIGHT_THEME = {
  dark: 0,
  baseColor: [0.988, 0.992, 0.969] as [number, number, number], // --background #fcfdf7
  glowColor: [1, 1, 1] as [number, number, number], // --card
  mapBrightness: 0.78,
  mapBaseBrightness: 0.03,
  diffuse: 1.05,
  mapDotOpacity: 0.22,
};

const DARK_THEME = {
  dark: 1,
  baseColor: [0.667, 0.706, 0.824] as [number, number, number], // --muted-foreground #aab4d2
  glowColor: [0.047, 0.114, 0.192] as [number, number, number], // --background, not the card
  mapBrightness: 1.9,
  mapBaseBrightness: 0.04,
  diffuse: 1.2,
  mapDotOpacity: 0.58,
};

const FOCUS_DURATION_MS = 520;
// One full turn every two minutes when idle.
const AUTO_ROTATE_PERIOD_MS = 120_000;
const AUTO_ROTATE_PHI_PER_MS = (Math.PI * 2) / AUTO_ROTATE_PERIOD_MS;

function cssColorToRgb(color: string): [number, number, number] | null {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
  const rgbMatch = color.match(/^rgba?\(\s*([\d.]+)[\s,/]+([\d.]+)[\s,/]+([\d.]+)/);
  if (rgbMatch) {
    return [
      Math.max(0, Math.min(1, Number(rgbMatch[1]) / 255)),
      Math.max(0, Math.min(1, Number(rgbMatch[2]) / 255)),
      Math.max(0, Math.min(1, Number(rgbMatch[3]) / 255)),
    ];
  }
  if (typeof document === 'undefined') return null;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#000';
  ctx.fillStyle = color;
  const hex = typeof ctx.fillStyle === 'string' ? ctx.fillStyle : '';
  const hexMatch = hex.match(/^#([0-9a-f]{6})$/i);
  if (!hexMatch) return null;
  return [
    parseInt(hexMatch[1].slice(0, 2), 16) / 255,
    parseInt(hexMatch[1].slice(2, 4), 16) / 255,
    parseInt(hexMatch[1].slice(4, 6), 16) / 255,
  ];
}

function mixRgb(
  from: [number, number, number],
  to: [number, number, number],
  amount: number
): [number, number, number] {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

function easeOutQuart(t: number) {
  return 1 - (1 - t) ** 4;
}

function shortestTarget(from: number, to: number) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff;
}

function visibleFocusUv(
  canvasEl: HTMLElement,
  aspect: number,
  variant: 'card' | 'expanded'
): { x: number; y: number } {
  if (variant === 'expanded') return { x: 0.5, y: 0.5 };
  const canvas = canvasEl.getBoundingClientRect();
  const card = canvasEl.closest('[data-active-pops-card]');
  const clip = card?.querySelector('[data-active-pops-globe-clip]');
  const crop = cropUvFromRects(canvas, (clip ?? canvasEl).getBoundingClientRect());
  return globeFocusUv(crop, aspect);
}

function visibleCropUv(canvasEl: HTMLElement, variant: 'card' | 'expanded') {
  if (variant === 'expanded') {
    return { left: 0, right: 1, top: 0, bottom: 1 };
  }
  const canvas = canvasEl.getBoundingClientRect();
  const card = canvasEl.closest('[data-active-pops-card]');
  const clip = card?.querySelector('[data-active-pops-globe-clip]');
  return cropUvFromRects(canvas, (clip ?? canvasEl).getBoundingClientRect());
}

function readCssVarRgb(name: string): [number, number, number] | null {
  if (typeof document === 'undefined' || !document.body) return null;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const raw = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return cssColorToRgb(raw);
}

function toCobeMarkers(pops: ActivePopMarker[], hovered: string | null, isDark: boolean): Marker[] {
  return pops.map((pop) => {
    const isHovered = pop.value === hovered;
    const isActive = !!pop.active;
    return {
      id: pop.value,
      location: pop.coords,
      size: isHovered ? MARKER_SIZE_HOVER : isActive ? MARKER_SIZE : IDLE_MARKER_SIZE,
      color: isActive
        ? isDark
          ? MARKER_COLOR_DARK
          : MARKER_COLOR_LIGHT
        : isDark
          ? IDLE_MARKER_COLOR_DARK
          : IDLE_MARKER_COLOR_LIGHT,
    };
  });
}

export function ActivePopsGlobe({
  variant = 'card',
  regionsWithCoords,
  hoveredRegion,
  onHoverRegion,
  onFocusRegion,
  focusRegion,
  focusToken,
  initialPhi,
  initialTheta,
  onRotationChange,
  persistentActiveTooltips = false,
  suspended = false,
  searching = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const popsRef = useRef(regionsWithCoords);
  const hoveredRef = useRef(hoveredRegion ?? null);
  const onHoverRef = useRef(onHoverRegion);
  const onFocusRef = useRef(onFocusRegion);
  const onRotationChangeRef = useRef(onRotationChange);
  const variantRef = useRef(variant);
  const persistentActiveTooltipsRef = useRef(persistentActiveTooltips);
  const suspendedRef = useRef(suspended);
  const pendingFocusRef = useRef<string | null>(null);
  const autoRotatePausedRef = useRef(false);
  const globeHoveredRef = useRef(false);
  const searchingRef = useRef(searching);
  const reduceMotionRef = useRef(false);
  const phiRef = useRef(initialPhi ?? INITIAL_PHI);
  const thetaRef = useRef(initialTheta ?? INITIAL_THETA);
  const scheduleRef = useRef<() => void>(() => {});
  const [tooltip, setTooltip] = useState<{ value: string; x: number; y: number } | null>(null);
  const [persistentTooltips, setPersistentTooltips] = useState<
    Array<{ value: string; x: number; y: number; offsetX: number; offsetY: number }>
  >([]);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const reduceMotion = useReducedMotion() ?? false;

  popsRef.current = regionsWithCoords;
  hoveredRef.current = hoveredRegion ?? null;
  onHoverRef.current = onHoverRegion;
  onFocusRef.current = onFocusRegion;
  onRotationChangeRef.current = onRotationChange;
  variantRef.current = variant;
  persistentActiveTooltipsRef.current = persistentActiveTooltips;
  suspendedRef.current = suspended;
  searchingRef.current = searching;
  reduceMotionRef.current = reduceMotion;

  const tooltipPop = tooltip
    ? regionsWithCoords.find((region) => region.value === tooltip.value)
    : undefined;

  useEffect(() => {
    if (initialPhi == null && initialTheta == null) return;
    if (!suspended) {
      phiRef.current = initialPhi ?? phiRef.current;
      thetaRef.current = initialTheta ?? thetaRef.current;
    }
    scheduleRef.current();
  }, [initialPhi, initialTheta, suspended]);

  useEffect(() => {
    if (!suspended) scheduleRef.current();
  }, [suspended]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const defaults = isDark ? DARK_THEME : LIGHT_THEME;
    const surface = isDark
      ? (readCssVarRgb('--background') ?? defaults.glowColor)
      : (readCssVarRgb('--card') ?? defaults.glowColor);
    const land = isDark
      ? (readCssVarRgb('--muted-foreground') ?? defaults.baseColor)
      : (readCssVarRgb('--background') ?? defaults.baseColor);
    const { mapDotOpacity, ...cobeTheme } = defaults;
    const theme = {
      ...cobeTheme,
      baseColor: mixRgb(surface, land, mapDotOpacity),
      glowColor: surface,
    };

    let width = container.clientWidth;
    let height = container.clientHeight;
    let phi = phiRef.current;
    let theta = thetaRef.current;
    let lastFrame = performance.now();
    let raf = 0;
    let dragging = false;
    let dragMoved = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastPopsKey = '';
    let focusAnim: {
      fromPhi: number;
      fromTheta: number;
      toPhi: number;
      toTheta: number;
      start: number;
    } | null = null;

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width,
      height,
      phi,
      theta,
      mapSamples: width < 480 ? 10_000 : variantRef.current === 'expanded' ? 24_000 : 16_000,
      scale: GLOBE_SCALE,
      offset: [0, 0],
      markerElevation: MARKER_ELEVATION,
      markerColor: isDark ? MARKER_COLOR_DARK : MARKER_COLOR_LIGHT,
      markers: toCobeMarkers(popsRef.current, hoveredRef.current, isDark),
      ...theme,
    });

    const syncSize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
    };

    const shouldAutoRotate = () =>
      !suspendedRef.current &&
      !reduceMotionRef.current &&
      !dragging &&
      !focusAnim &&
      (searchingRef.current ||
        (!autoRotatePausedRef.current && !globeHoveredRef.current));

    const syncRotation = () => {
      onRotationChangeRef.current?.(phi, theta);
    };

    const updatePersistentTooltips = () => {
      if (!persistentActiveTooltipsRef.current) return;
      const aspect = width / Math.max(height, 1);
      const crop = visibleCropUv(container, variantRef.current);
      const anchors = popsRef.current
        .filter((pop) => pop.active)
        .flatMap((pop) => {
          const projected = projectLocation(pop.coords[0], pop.coords[1], phi, theta, aspect);
          if (!isMarkerInView(projected, crop)) return [];
          return [{ value: pop.value, x: projected.x * 100, y: projected.y * 100 }];
        });
      setPersistentTooltips(layoutPersistentTooltips(anchors, width, height));
    };

    const startFocus = (value: string) => {
      if (variantRef.current === 'expanded') return;
      const pop = popsRef.current.find((region) => region.value === value);
      if (!pop?.coords) return;
      const aspect = width / Math.max(height, 1);
      const target = visibleFocusUv(container, aspect, variantRef.current);
      const next = focusAngles(pop.coords[0], pop.coords[1], aspect, target.x, target.y);
      const toPhi = shortestTarget(phi, next.phi);
      const projected = projectLocation(pop.coords[0], pop.coords[1], phi, theta, aspect);
      const alreadyFramed =
        Math.hypot(projected.x - target.x, projected.y - target.y) < 0.04 &&
        projected.front &&
        Math.hypot(toPhi - phi, next.theta - theta) < 0.06;
      if (alreadyFramed) return;
      focusAnim = {
        fromPhi: phi,
        fromTheta: theta,
        toPhi,
        toTheta: next.theta,
        start: performance.now(),
      };
    };

    const render = () => {
      if (suspendedRef.current) return;
      const now = performance.now();
      const dt = Math.min(now - lastFrame, 48);
      lastFrame = now;
      syncSize();

      const pendingFocus = pendingFocusRef.current;
      if (pendingFocus) {
        pendingFocusRef.current = null;
        startFocus(pendingFocus);
      }

      if (shouldAutoRotate()) {
        phi += AUTO_ROTATE_PHI_PER_MS * dt;
        phiRef.current = phi;
        syncRotation();
      }

      if (focusAnim) {
        const t = Math.min(1, (performance.now() - focusAnim.start) / FOCUS_DURATION_MS);
        const e = easeOutQuart(t);
        phi = focusAnim.fromPhi + (focusAnim.toPhi - focusAnim.fromPhi) * e;
        theta = focusAnim.fromTheta + (focusAnim.toTheta - focusAnim.fromTheta) * e;
        phiRef.current = phi;
        thetaRef.current = theta;
        syncRotation();
        if (t >= 1) {
          phi = shortestTarget(0, phi);
          phiRef.current = phi;
          syncRotation();
          focusAnim = null;
        }
      }

      updatePersistentTooltips();

      const hovered = dragging ? null : hoveredRef.current;
      const popsKey = popsRef.current
        .map((pop) => `${pop.value}:${pop.active ? '1' : '0'}`)
        .join('|')
        .concat(`:${hovered ?? ''}`);
      if (popsKey !== lastPopsKey) {
        lastPopsKey = popsKey;
        globe.update({ markers: toCobeMarkers(popsRef.current, hovered, isDark) });
      }

      globe.update({
        phi,
        theta,
        width,
        height,
        ...theme,
      });
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        render();
        if (
          !suspendedRef.current &&
          (dragging || focusAnim || shouldAutoRotate() || persistentActiveTooltipsRef.current)
        ) {
          schedule();
        }
      });
    };
    scheduleRef.current = schedule;

    const resizeObserver = new ResizeObserver(() => schedule());
    resizeObserver.observe(container);

    const hitTest = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const aspect = width / Math.max(height, 1);

      let next: string | null = null;
      let nextX = 0;
      let nextY = 0;
      let best = 0.04;

      for (const pop of popsRef.current) {
        const projected = projectLocation(pop.coords[0], pop.coords[1], phi, theta, aspect);
        if (!isMarkerInView(projected, visibleCropUv(container, variantRef.current))) continue;
        const dx = projected.x - px;
        const dy = projected.y - py;
        const dist = Math.hypot(dx, dy);
        if (dist < best) {
          best = dist;
          next = pop.value;
          nextX = projected.x * 100;
          nextY = projected.y * 100;
        }
      }

      if (next !== hoveredRef.current) onHoverRef.current?.(next);
      setTooltip(next ? { value: next, x: nextX, y: nextY } : null);
      schedule();
      return next;
    };

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      dragMoved = false;
      focusAnim = null;
      globeHoveredRef.current = true;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      container.setPointerCapture(event.pointerId);
      container.style.cursor = 'grabbing';
      onHoverRef.current?.(null);
      setTooltip(null);
      schedule();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) {
        hitTest(event);
        return;
      }

      const dx = event.clientX - lastPointerX;
      const dy = event.clientY - lastPointerY;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      if (Math.hypot(dx, dy) >= DRAG_SLOP_PX) dragMoved = true;

      phi += dx * DRAG_PHI_PER_PX;
      theta = Math.min(THETA_MAX, Math.max(THETA_MIN, theta + dy * DRAG_THETA_PER_PX));
      phiRef.current = phi;
      thetaRef.current = theta;
      syncRotation();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      container.releasePointerCapture(event.pointerId);
      container.style.cursor = 'grab';
      if (!dragMoved) {
        const hit = hitTest(event);
        if (hit) onFocusRef.current?.(hit);
      } else schedule();
    };

    const onPointerEnter = () => {
      globeHoveredRef.current = true;
      schedule();
    };

    const onPointerLeave = () => {
      globeHoveredRef.current = false;
      if (dragging) return;
      onHoverRef.current?.(null);
      setTooltip(null);
      schedule();
    };

    container.addEventListener('pointerenter', onPointerEnter);
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    container.addEventListener('pointerleave', onPointerLeave);
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      container.removeEventListener('pointerenter', onPointerEnter);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('pointerleave', onPointerLeave);
      globe.destroy();
      container.replaceChildren();
    };
  }, [isDark]);

  useEffect(() => {
    scheduleRef.current();
  }, [searching, reduceMotion]);

  useEffect(() => {
    if (variant !== 'card' || !focusRegion) return;
    autoRotatePausedRef.current = true;
    pendingFocusRef.current = focusRegion;
    scheduleRef.current();
  }, [focusRegion, focusToken, variant]);

  useEffect(() => {
    if (variant !== 'card' || !hoveredRegion) {
      if (variant === 'card') setTooltip(null);
      scheduleRef.current();
      return;
    }
    const pop = regionsWithCoords.find((region) => region.value === hoveredRegion);
    const container = containerRef.current;
    if (!pop || !container) return;
    const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    // Tooltip from pill hover is placed near the marker on the next move;
    // keep a stable overlay while the globe is paused.
    const projected = projectLocation(
      pop.coords[0],
      pop.coords[1],
      phiRef.current,
      thetaRef.current,
      aspect
    );
    if (!isMarkerInView(projected, visibleCropUv(container, 'card'))) {
      setTooltip(null);
      scheduleRef.current();
      return;
    }
    setTooltip({ value: pop.value, x: projected.x * 100, y: projected.y * 100 });
    scheduleRef.current();
  }, [hoveredRegion, regionsWithCoords, variant]);

  const tooltipLeft = tooltip?.x ?? 0;
  const tooltipTop = tooltip?.y ?? 0;
  const tooltipRect = containerRef.current?.getBoundingClientRect();
  const hoverTooltipStyle =
    tooltip && tooltipRect
      ? {
          left: tooltipRect.left + (tooltipLeft / 100) * tooltipRect.width,
          top: tooltipRect.top + (tooltipTop / 100) * tooltipRect.height,
          ...tooltipFlipTransform(tooltipLeft, tooltipTop),
        }
      : undefined;

  return (
    <div className="relative size-full">
      <div ref={containerRef} className="absolute inset-0 cursor-grab touch-none" />
      {variant === 'card' &&
        tooltip &&
        tooltipPop &&
        hoverTooltipStyle &&
        createPortal(
          <ActivePopTooltipCard
            pop={tooltipPop}
            className="fixed z-50"
            style={hoverTooltipStyle}
          />,
          document.body
        )}
      {persistentActiveTooltips &&
        persistentTooltips.map((entry) => {
          const pop = regionsWithCoords.find((region) => region.value === entry.value);
          if (!pop) return null;
          return (
            <ActivePopTooltipCard
              key={entry.value}
              pop={pop}
              className="absolute z-10"
              style={tooltipOffsetStyle(entry.x, entry.y, entry.offsetX, entry.offsetY)}
            />
          );
        })}
    </div>
  );
}
