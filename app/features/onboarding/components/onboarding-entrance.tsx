import { onboardingStaggerTransition, onboardingStaggerVariants } from '../onboarding-motion';
import { cn } from '@datum-cloud/datum-ui/utils';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

type OnboardingEntranceProps = {
  children: ReactNode;
  className?: string;
  delay?: 0 | 1 | 2 | 3;
};

// Literal class names so Tailwind emits them; index matches the `delay` prop.
const ENTRANCE_DELAY_CLASS_NAMES = [
  '',
  'motion-safe:delay-[80ms]',
  'motion-safe:delay-[140ms]',
  'motion-safe:delay-[200ms]',
] as const;

/**
 * A CSS entrance rather than a motion one. A motion node server-renders with
 * `opacity: 0` and only JavaScript reveals it, so a slow or failed hydration
 * left the onboarding card blank until a refresh. The browser runs this
 * animation on first paint, and it leaves no transform behind that would get
 * in the way of input focus.
 */
export const OnboardingEntrance = ({ children, className, delay = 0 }: OnboardingEntranceProps) => (
  <div
    className={cn(
      'animate-in fade-in fill-mode-backwards duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
      'motion-safe:slide-in-from-bottom-[10px] motion-safe:zoom-in-[0.98] motion-safe:duration-[420ms]',
      ENTRANCE_DELAY_CLASS_NAMES[delay],
      className
    )}>
    {children}
  </div>
);

type OnboardingStaggerProps = {
  visible: boolean;
  index: number;
  children: ReactNode;
  className?: string;
};

export const OnboardingStagger = ({
  visible,
  index,
  children,
  className,
}: OnboardingStaggerProps) => {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      animate={visible ? 'visible' : 'hidden'}
      variants={onboardingStaggerVariants(reducedMotion)}
      transition={onboardingStaggerTransition(index, reducedMotion)}>
      {children}
    </motion.div>
  );
};
