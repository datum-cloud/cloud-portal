import type { ActivePopMarker } from './active-pops-map';
import { ActivePopsMap } from './active-pops-map';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { XIcon } from 'lucide-react';
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const ENTER_MS = 340;
const EXIT_MS = 240;
const IDENTITY_TRANSFORM = 'translate3d(0px, 0px, 0px) scale(1, 1)';

type OriginRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type CollapseTransform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
};

interface Props {
  open: boolean;
  originRect: OriginRect | null;
  regionsWithCoords: ActivePopMarker[];
  rotation: { phi: number; theta: number };
  onRotationChange: (phi: number, theta: number) => void;
  onClose: () => void;
  onEntered?: () => void;
  onExitStart?: () => void;
  onExited?: () => void;
  activeCount: number;
  locationCount: number;
}

function getPanelTargetRect(): OriginRect {
  const inset = window.matchMedia('(min-width: 640px)').matches ? 24 : 12;
  return {
    top: inset,
    left: inset,
    width: window.innerWidth - inset * 2,
    height: window.innerHeight - inset * 2,
  };
}

function collapseTransform(origin: OriginRect, target: OriginRect): CollapseTransform {
  const originCenterX = origin.left + origin.width / 2;
  const originCenterY = origin.top + origin.height / 2;
  const targetCenterX = target.left + target.width / 2;
  const targetCenterY = target.top + target.height / 2;
  return {
    x: originCenterX - targetCenterX,
    y: originCenterY - targetCenterY,
    scaleX: Math.max(origin.width / target.width, 0.001),
    scaleY: Math.max(origin.height / target.height, 0.001),
  };
}

function transformStyle(transform: CollapseTransform) {
  return `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scaleX}, ${transform.scaleY})`;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return prefersReducedMotion;
}

export function ActivePopsExpandOverlay({
  open,
  originRect,
  regionsWithCoords,
  rotation,
  onRotationChange,
  onClose,
  onEntered,
  onExitStart,
  onExited,
  activeCount,
  locationCount,
}: Props) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(false);
  const [targetRect, setTargetRect] = useState<OriginRect | null>(null);
  const collapseRef = useRef<CollapseTransform | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isExitingRef = useRef(false);
  const enterStartedRef = useRef(false);

  useLayoutEffect(() => {
    if (!mounted || !originRect) return;
    const target = getPanelTargetRect();
    setTargetRect(target);
    collapseRef.current = collapseTransform(originRect, target);
  }, [mounted, originRect]);

  useEffect(() => {
    if (!open) return;
    enterStartedRef.current = false;
    isExitingRef.current = false;
    setMounted(true);
    setExpanded(false);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setExpanded(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (open || !mounted) return;
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    if (originRect) {
      const target = getPanelTargetRect();
      collapseRef.current = collapseTransform(originRect, target);
    }
    onExitStart?.();
    setExpanded(false);
  }, [open, mounted, originRect, onExitStart]);

  useEffect(() => {
    if (!open && mounted && prefersReducedMotion) {
      const timer = window.setTimeout(() => {
        if (!isExitingRef.current) return;
        isExitingRef.current = false;
        setMounted(false);
        onExited?.();
      }, 120);
      return () => window.clearTimeout(timer);
    }
  }, [open, mounted, prefersReducedMotion, onExited]);

  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  const handleTransitionEnd = useCallback(
    (event: React.TransitionEvent<HTMLDivElement>) => {
      if (event.target !== panelRef.current || event.propertyName !== 'transform') return;

      if (expanded) {
        if (!enterStartedRef.current) {
          enterStartedRef.current = true;
          onEntered?.();
        }
        return;
      }

      if (!expanded && isExitingRef.current) {
        isExitingRef.current = false;
        setMounted(false);
        onExited?.();
      }
    },
    [expanded, onEntered, onExited]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!mounted) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, mounted]);

  if (!mounted || !originRect || !targetRect || !collapseRef.current) return null;

  const durationMs = expanded ? ENTER_MS : EXIT_MS;
  const collapsed = collapseRef.current;
  const panelTransform =
    expanded || prefersReducedMotion ? IDENTITY_TRANSFORM : transformStyle(collapsed);

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close expanded map"
        className={cn(
          'bg-background/70 absolute inset-0 backdrop-blur-[2px] transition-opacity ease-out',
          expanded ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          transitionDuration: `${durationMs}ms`,
          transitionTimingFunction: EASE_OUT,
        }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="bg-card fixed overflow-hidden rounded-2xl shadow-2xl will-change-transform"
        onTransitionEnd={handleTransitionEnd}
        style={{
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
          transform: panelTransform,
          opacity: expanded ? 1 : 0,
          transitionProperty: prefersReducedMotion ? 'opacity' : 'transform, opacity',
          transitionDuration: `${durationMs}ms`,
          transitionTimingFunction: EASE_OUT,
        }}>
        <div
          className="relative flex size-full min-h-0 flex-col"
          style={{
            opacity: expanded ? 1 : 0,
            filter: expanded ? 'none' : 'blur(2px)',
            transition: prefersReducedMotion
              ? `opacity ${durationMs}ms ${EASE_OUT}`
              : `opacity ${durationMs}ms ${EASE_OUT}, filter ${durationMs}ms ${EASE_OUT}`,
          }}>
          <div className="border-border/60 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
            <div>
              <p className="text-base font-semibold">Active POPs</p>
              <p className="text-muted-foreground text-sm">
                {activeCount} with traffic · {locationCount} locations
              </p>
            </div>
            <Button
              htmlType="button"
              type="quaternary"
              theme="outline"
              size="small"
              aria-label="Close expanded map"
              className="transition-transform duration-[160ms] ease-out active:scale-[0.97]"
              onClick={onClose}>
              <Icon icon={XIcon} size={16} />
            </Button>
          </div>
          <div className="relative min-h-0 flex-1">
            <Suspense fallback={<div className="bg-muted/30 size-full" />}>
              <ActivePopsMap
                variant="expanded"
                regionsWithCoords={regionsWithCoords}
                initialPhi={rotation.phi}
                initialTheta={rotation.theta}
                onRotationChange={onRotationChange}
                persistentActiveTooltips
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
