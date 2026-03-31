import { geoMercator, geoPath } from 'd3-geo';
import { useCallback, useEffect, useRef } from 'react';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

interface RegionWithCoords {
  value: string;
  label: string;
  coords: [number, number]; // [lat, lng]
}

interface Props {
  regionsWithCoords: RegionWithCoords[];
  hoveredRegion?: string | null;
}

const DOT_SPACING = 4;
const DOT_RADIUS = 1.2;
const MARKER_RADIUS = 6;

let cachedLand: ReturnType<typeof feature> | null = null;
async function getLand() {
  if (cachedLand) return cachedLand;
  const topo = (await import('world-atlas/land-110m.json')) as unknown as Topology<{
    land: GeometryCollection;
  }>;
  cachedLand = feature(topo, topo.objects.land);
  return cachedLand;
}

export function ActivePopsFlatMap({ regionsWithCoords, hoveredRegion }: Props) {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const markerCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const projectionRef = useRef<ReturnType<typeof geoMercator> | null>(null);
  const animFrameRef = useRef<number>(0);

  // Keep refs updated on every render so the animation loop always sees current values
  // without needing to restart when props change.
  const regionsRef = useRef(regionsWithCoords);
  regionsRef.current = regionsWithCoords;
  const hoveredRef = useRef<string | null | undefined>(hoveredRegion);
  hoveredRef.current = hoveredRegion;

  // Draws the static dot grid into bgCanvas and stores the projection.
  // Only needs to run on mount and resize.
  const drawBackground = useCallback(async (width: number, height: number) => {
    const bgCanvas = bgCanvasRef.current;
    const markerCanvas = markerCanvasRef.current;
    if (!bgCanvas || !markerCanvas || width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio ?? 1;

    for (const canvas of [bgCanvas, markerCanvas]) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const land = await getLand();
    const projection = geoMercator().fitExtent(
      [
        [0, 0],
        [width, height],
      ],
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPoint',
          coordinates: [
            [-180, -60],
            [180, 75],
          ],
        },
        properties: null,
      }
    );
    projectionRef.current = projection;

    const path = geoPath(projection, ctx);
    const dotColor = 'oklch(0.67 0 0 / 1)';

    ctx.save();
    ctx.beginPath();
    path(land);
    ctx.clip();

    ctx.fillStyle = dotColor;
    for (let x = 0; x < width; x += DOT_SPACING) {
      for (let y = 0; y < height; y += DOT_SPACING) {
        ctx.beginPath();
        ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }, []);

  // Starts the RAF loop that animates markers on the top canvas.
  // Reads from refs so it never needs to restart when regionsWithCoords/hoveredRegion changes.
  const startAnimation = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);

    const animate = () => {
      const markerCanvas = markerCanvasRef.current;
      const projection = projectionRef.current;
      if (!markerCanvas || !projection || markerCanvas.width === 0) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const dpr = window.devicePixelRatio ?? 1;
      const width = markerCanvas.width / dpr;
      const height = markerCanvas.height / dpr;
      const ctx = markerCanvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const style = getComputedStyle(markerCanvas);
      const markerColor = style.getPropertyValue('--primary').trim() || 'oklch(0.61 0.044 18.4)';

      const pulse = (1 + Math.sin((Date.now() / 700) % (Math.PI * 2))) / 2; // 0 → 1

      for (const { coords, value } of regionsRef.current) {
        const isHovered = value === hoveredRef.current;
        const projected = projection([coords[1], coords[0]]);
        if (!projected) continue;
        const [px, py] = projected;

        const outerRadius = (isHovered ? MARKER_RADIUS + 4 : MARKER_RADIUS + 3) + pulse * 4;
        const outerOpacity = isHovered ? 0.2 + 0.2 * pulse : 0.1 + 0.15 * pulse;
        const innerRadius = isHovered ? MARKER_RADIUS + 2 : MARKER_RADIUS;

        ctx.beginPath();
        ctx.arc(px, py, outerRadius, 0, Math.PI * 2);
        ctx.fillStyle = markerColor.replace(/\)$/, ` / ${outerOpacity.toFixed(2)})`);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = markerColor;
        ctx.fill();
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(async (entries) => {
      const entry = entries[0];
      if (!entry) return;
      await drawBackground(entry.contentRect.width, entry.contentRect.height);
      startAnimation();
    });

    ro.observe(container);

    void (async () => {
      await drawBackground(container.clientWidth, container.clientHeight);
      startAnimation();
    })();

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawBackground, startAnimation]);

  return (
    <div
      ref={containerRef}
      className="bg-background relative aspect-2/1 w-full overflow-hidden rounded-lg border">
      <canvas ref={bgCanvasRef} className="absolute inset-0 block" />
      <canvas ref={markerCanvasRef} className="absolute inset-0 block" />
    </div>
  );
}
