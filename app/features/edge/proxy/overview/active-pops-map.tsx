import { lazyWithRetry } from '@/utils/helpers/lazy-with-retry';
import { Suspense, useState } from 'react';

interface RegionWithCoords {
  value: string;
  label: string;
  coords: [number, number]; // [lat, lng]
}

const ActivePopsFlatMap = lazyWithRetry(
  () => import('./active-pops-flat-map').then((m) => ({ default: m.ActivePopsFlatMap })),
  'active-pops-flat-map'
);

const Fallback = () => (
  <div className="bg-muted aspect-2/1 w-full animate-pulse rounded-lg border" />
);

export const ActivePopsMap = ({ regionsWithCoords }: { regionsWithCoords: RegionWithCoords[] }) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  return (
    <div className="relative">
      <Suspense fallback={<Fallback />}>
        <ActivePopsFlatMap regionsWithCoords={regionsWithCoords} hoveredRegion={hoveredRegion} />
      </Suspense>

      {/* Location list overlaid inside the map */}
      <div className="absolute bottom-2 left-4 flex flex-col gap-1">
        {regionsWithCoords.length === 0 ? (
          <p className="text-muted-foreground text-sm">No active POPs found.</p>
        ) : (
          regionsWithCoords.map((r) => (
            <div
              key={r.value}
              className="text-1xs flex cursor-default items-center gap-2 md:text-sm"
              onMouseEnter={() => setHoveredRegion(r.value)}
              onMouseLeave={() => setHoveredRegion(null)}>
              <span className="size-2 shrink-0 rounded-full bg-[#B3D56F]" />
              <span className="text-foreground mb-0.5 truncate">{r.label}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
