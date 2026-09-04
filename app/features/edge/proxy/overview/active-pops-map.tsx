import type { ActivePopMetrics } from './active-pops-metrics';
import { lazyWithRetry } from '@/utils/helpers/lazy-with-retry';
import { Suspense } from 'react';

export type ActivePopMarker = {
  value: string;
  city: string;
  subtitle: string;
  coords: [number, number];
  active?: boolean;
  metrics?: ActivePopMetrics;
};

const ActivePopsGlobe = lazyWithRetry(
  () => import('./active-pops-globe').then((m) => ({ default: m.ActivePopsGlobe })),
  'active-pops-globe'
);

const Fallback = () => <div className="bg-muted/20 size-full motion-safe:animate-pulse" />;

export const ActivePopsMap = ({
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
  persistentActiveTooltips,
  suspended,
  searching,
}: {
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
}) => {
  return (
    <Suspense fallback={<Fallback />}>
      <ActivePopsGlobe
        variant={variant}
        regionsWithCoords={regionsWithCoords}
        hoveredRegion={hoveredRegion}
        onHoverRegion={onHoverRegion}
        onFocusRegion={onFocusRegion}
        focusRegion={focusRegion}
        focusToken={focusToken}
        initialPhi={initialPhi}
        initialTheta={initialTheta}
        onRotationChange={onRotationChange}
        persistentActiveTooltips={persistentActiveTooltips}
        suspended={suspended}
        searching={searching}
      />
    </Suspense>
  );
};
