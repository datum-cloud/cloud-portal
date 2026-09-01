import type { ActivePopMarker } from './active-pops-map';
import { useTheme } from '@datum-cloud/datum-ui/theme';
import createGlobe, { type Marker } from 'cobe';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  regionsWithCoords: ActivePopMarker[];
  hoveredRegion?: string | null;
  onHoverRegion?: (value: string | null) => void;
}

const MARKER_COLOR: [number, number, number] = [0.702, 0.835, 0.435]; // #B3D56F
const IDLE_MARKER_COLOR_LIGHT: [number, number, number] = [0.55, 0.6, 0.57];
const IDLE_MARKER_COLOR_DARK: [number, number, number] = [0.62, 0.68, 0.64];
const MARKER_SIZE = 0.045;
const IDLE_MARKER_SIZE = 0.028;
const MARKER_SIZE_HOVER = 0.07;
const MARKER_ELEVATION = 0.02;
const GLOBE_RADIUS = 0.8;
// Globe canvas sits off the right edge; start with the Americas in the visible crop.
const INITIAL_PHI = -1.03;
const INITIAL_THETA = 0.34;
const DRAG_PHI_PER_PX = 0.005;
const DRAG_THETA_PER_PX = 0.0035;
const THETA_MIN = -0.6;
const THETA_MAX = 0.8;
const DRAG_SLOP_PX = 4;

const LIGHT_THEME = {
  dark: 0,
  baseColor: [0.678, 0.729, 0.69] as [number, number, number], // #ADBAB0
  glowColor: [1, 1, 1] as [number, number, number],
  mapBrightness: 5.2,
  mapBaseBrightness: 0,
  diffuse: 1.15,
};

const DARK_THEME = {
  dark: 0.68,
  baseColor: [0.46, 0.52, 0.49] as [number, number, number],
  glowColor: [0.18, 0.22, 0.28] as [number, number, number],
  mapBrightness: 2.6,
  mapBaseBrightness: 0.06,
  diffuse: 1.7,
};

function latLngToVec3(lat: number, lng: number): [number, number, number] {
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180 - Math.PI;
  const cosLat = Math.cos(latR);
  return [-cosLat * Math.cos(lngR), Math.sin(latR), cosLat * Math.sin(lngR)];
}

function projectLocation(
  lat: number,
  lng: number,
  phi: number,
  theta: number,
  aspect: number
): { x: number; y: number; visible: boolean } {
  const [vx, vy, vz] = latLngToVec3(lat, lng);
  const r = GLOBE_RADIUS + MARKER_ELEVATION;
  const x0 = vx * r;
  const y0 = vy * r;
  const z0 = vz * r;
  const cosT = Math.cos(theta);
  const cosP = Math.cos(phi);
  const sinT = Math.sin(theta);
  const sinP = Math.sin(phi);
  const c = cosP * x0 + sinP * z0;
  const s = sinP * sinT * x0 + cosT * y0 - cosP * sinT * z0;
  const z = -sinP * cosT * x0 + sinT * y0 + cosP * cosT * z0;
  return {
    x: (c / aspect + 1) / 2,
    y: (-s + 1) / 2,
    visible: z >= 0 || c * c + s * s >= 0.64,
  };
}

function toCobeMarkers(pops: ActivePopMarker[], hovered: string | null, isDark: boolean): Marker[] {
  return pops.map((pop) => {
    const isHovered = pop.value === hovered;
    const isActive = !!pop.active;
    return {
      id: pop.value,
      location: pop.coords,
      size: isHovered ? MARKER_SIZE_HOVER : isActive ? MARKER_SIZE : IDLE_MARKER_SIZE,
      color: isActive ? MARKER_COLOR : isDark ? IDLE_MARKER_COLOR_DARK : IDLE_MARKER_COLOR_LIGHT,
    };
  });
}

export function ActivePopsGlobe({ regionsWithCoords, hoveredRegion, onHoverRegion }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const popsRef = useRef(regionsWithCoords);
  const hoveredRef = useRef(hoveredRegion ?? null);
  const onHoverRef = useRef(onHoverRegion);
  const phiRef = useRef(INITIAL_PHI);
  const thetaRef = useRef(INITIAL_THETA);
  const scheduleRef = useRef<() => void>(() => {});
  const [tooltip, setTooltip] = useState<{ value: string; x: number; y: number } | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  popsRef.current = regionsWithCoords;
  hoveredRef.current = hoveredRegion ?? null;
  onHoverRef.current = onHoverRegion;

  const tooltipPop = tooltip
    ? regionsWithCoords.find((region) => region.value === tooltip.value)
    : undefined;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const theme = isDark ? DARK_THEME : LIGHT_THEME;

    let width = container.clientWidth;
    let height = container.clientHeight;
    let phi = phiRef.current;
    let theta = thetaRef.current;
    let raf = 0;
    let dragging = false;
    let dragMoved = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastPopsKey = '';

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width,
      height,
      phi,
      theta,
      mapSamples: width < 480 ? 10_000 : 16_000,
      scale: 1.08,
      offset: [0, 0],
      markerElevation: MARKER_ELEVATION,
      markerColor: MARKER_COLOR,
      markers: toCobeMarkers(popsRef.current, hoveredRef.current, isDark),
      ...theme,
    });

    const syncSize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
    };

    const render = () => {
      syncSize();
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
        if (dragging) schedule();
      });
    };
    scheduleRef.current = schedule;

    const resizeObserver = new ResizeObserver(() => schedule());
    resizeObserver.observe(container);

    const hitTest = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const aspect = width / Math.max(height, 1);

      let next: string | null = null;
      let nextX = 0;
      let nextY = 0;
      let best = 0.04;

      for (const pop of popsRef.current) {
        const projected = projectLocation(pop.coords[0], pop.coords[1], phi, theta, aspect);
        if (!projected.visible) continue;
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
    };

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      dragMoved = false;
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
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      container.releasePointerCapture(event.pointerId);
      container.style.cursor = 'grab';
      if (!dragMoved) hitTest(event);
      else schedule();
    };

    const onPointerLeave = () => {
      if (dragging) return;
      onHoverRef.current?.(null);
      setTooltip(null);
      schedule();
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    container.addEventListener('pointerleave', onPointerLeave);
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
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
    if (!hoveredRegion) {
      setTooltip(null);
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
    if (!projected.visible) {
      setTooltip(null);
      scheduleRef.current();
      return;
    }
    setTooltip({ value: pop.value, x: projected.x * 100, y: projected.y * 100 });
    scheduleRef.current();
  }, [hoveredRegion, regionsWithCoords]);

  const tooltipLeft = tooltip?.x ?? 0;
  const tooltipTop = tooltip?.y ?? 0;
  const flipX = tooltipLeft > 32;
  const flipY = tooltipTop > 70;
  const tooltipRect = containerRef.current?.getBoundingClientRect();
  const tooltipStyle =
    tooltip && tooltipRect
      ? {
          left: tooltipRect.left + (tooltipLeft / 100) * tooltipRect.width,
          top: tooltipRect.top + (tooltipTop / 100) * tooltipRect.height,
          transform: `translate(${flipX ? 'calc(-100% - 10px)' : '10px'}, ${flipY ? 'calc(-100% - 10px)' : '10px'})`,
        }
      : undefined;

  return (
    <div className="relative size-full">
      <div ref={containerRef} className="absolute inset-0 cursor-grab touch-none" />
      {tooltip &&
        tooltipPop &&
        tooltipStyle &&
        createPortal(
          <div
            className="bg-background text-foreground pointer-events-none fixed z-50 flex max-w-56 flex-col gap-1 rounded-lg border px-3 py-2 shadow-lg"
            style={tooltipStyle}>
            <p className="text-xs font-medium">{tooltipPop.city}</p>
            <p className="text-muted-foreground text-xs">{tooltipPop.subtitle}</p>
          </div>,
          document.body
        )}
    </div>
  );
}
