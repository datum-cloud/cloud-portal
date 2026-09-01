import { lazyWithRetry } from '@/utils/helpers/lazy-with-retry';
import { Suspense } from 'react';

export type ActivePopMarker = {
  value: string;
  city: string;
  subtitle: string;
  coords: [number, number];
};

const ActivePopsFlatMap = lazyWithRetry(
  () => import('./active-pops-flat-map').then((m) => ({ default: m.ActivePopsFlatMap })),
  'active-pops-flat-map'
);

const Fallback = () => (
  <div className="bg-muted aspect-[1038/591] w-full animate-pulse rounded-lg border" />
);

export const ActivePopsMap = ({
  regionsWithCoords,
  hoveredRegion,
  onHoverRegion,
}: {
  regionsWithCoords: ActivePopMarker[];
  hoveredRegion?: string | null;
  onHoverRegion?: (value: string | null) => void;
}) => {
  return (
    <Suspense fallback={<Fallback />}>
      <ActivePopsFlatMap
        regionsWithCoords={regionsWithCoords}
        hoveredRegion={hoveredRegion}
        onHoverRegion={onHoverRegion}
      />
    </Suspense>
  );
};
