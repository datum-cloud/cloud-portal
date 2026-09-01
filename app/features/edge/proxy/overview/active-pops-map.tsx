import { lazyWithRetry } from '@/utils/helpers/lazy-with-retry';
import { Suspense } from 'react';

export type ActivePopMarker = {
  value: string;
  city: string;
  subtitle: string;
  coords: [number, number];
  active?: boolean;
};

const ActivePopsGlobe = lazyWithRetry(
  () => import('./active-pops-globe').then((m) => ({ default: m.ActivePopsGlobe })),
  'active-pops-globe'
);

const Fallback = () => <div className="size-full" />;

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
      <ActivePopsGlobe
        regionsWithCoords={regionsWithCoords}
        hoveredRegion={hoveredRegion}
        onHoverRegion={onHoverRegion}
      />
    </Suspense>
  );
};
