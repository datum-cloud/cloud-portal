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

const Fallback = () => <div className="bg-muted/20 size-full motion-safe:animate-pulse" />;

export const ActivePopsMap = ({
  regionsWithCoords,
  hoveredRegion,
  onHoverRegion,
  onFocusRegion,
  focusRegion,
  focusToken,
  searching,
}: {
  regionsWithCoords: ActivePopMarker[];
  hoveredRegion?: string | null;
  onHoverRegion?: (value: string | null) => void;
  onFocusRegion?: (value: string) => void;
  focusRegion?: string | null;
  focusToken?: number;
  searching?: boolean;
}) => {
  return (
    <Suspense fallback={<Fallback />}>
      <ActivePopsGlobe
        regionsWithCoords={regionsWithCoords}
        hoveredRegion={hoveredRegion}
        onHoverRegion={onHoverRegion}
        onFocusRegion={onFocusRegion}
        focusRegion={focusRegion}
        focusToken={focusToken}
        searching={searching}
      />
    </Suspense>
  );
};
