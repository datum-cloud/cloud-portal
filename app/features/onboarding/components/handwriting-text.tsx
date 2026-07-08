import rocksalt from '../fonts/rocksalt/bundle.ts';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, type CSSProperties } from 'react';
import { TegakiRenderer } from 'tegaki';

export type HandwritingTextProps = {
  text: string;
  className?: string;
  style?: CSSProperties;
  /** Fires once when animation reaches 100%. */
  onComplete?: () => void;
  /** Fires during playback with linear progress from 0 to 1. */
  onProgress?: (progress: number) => void;
};

const defaultClassName = 'text-primary font-normal leading-[29px]';
const defaultStyle: CSSProperties = { fontSize: '20px' };

export const HandwritingText = ({
  text,
  className,
  style,
  onComplete,
  onProgress,
}: HandwritingTextProps) => {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);
  const totalDurationRef = useRef(0);
  onCompleteRef.current = onComplete;
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!prefersReducedMotion) return;
    onProgressRef.current?.(1);
    onCompleteRef.current?.();
  }, [prefersReducedMotion]);

  return (
    <TegakiRenderer
      id={text.toLowerCase().replaceAll(' ', '-')}
      aria-hidden
      font={rocksalt}
      className={cn(defaultClassName, className)}
      style={{ ...defaultStyle, ...style }}
      onChangeTimeline={(timeline) => {
        totalDurationRef.current = timeline.totalDuration;
      }}
      time={
        prefersReducedMotion
          ? '100%'
          : {
              mode: 'uncontrolled',
              speed: 6,
              onTimeChange: (time) => {
                const total = totalDurationRef.current;
                if (!total || !onProgressRef.current) return;
                onProgressRef.current(Math.min(time / total, 1));
              },
            }
      }
      onComplete={prefersReducedMotion ? undefined : onComplete}>
      {text}
    </TegakiRenderer>
  );
};
