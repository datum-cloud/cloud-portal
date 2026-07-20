import {
  ONBOARDING_DELAYS,
  onboardingEntranceTransition,
  onboardingEntranceVariants,
  onboardingStaggerTransition,
  onboardingStaggerVariants,
} from '../onboarding-motion';
import { cn } from '@datum-cloud/datum-ui/utils';
import { motion, useReducedMotion } from 'motion/react';
import { useState, type ReactNode } from 'react';

type OnboardingEntranceProps = {
  children: ReactNode;
  className?: string;
  delay?: 0 | 1 | 2 | 3;
};

export const OnboardingEntrance = ({ children, className, delay = 0 }: OnboardingEntranceProps) => {
  const reducedMotion = useReducedMotion() ?? false;
  // Transforms left on a wrapping motion node break input focus (click often
  // needs a second attempt). Once the entrance settles, stop controlling
  // transform props and force them clear.
  const [entranceSettled, setEntranceSettled] = useState(false);

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate={entranceSettled ? { opacity: 1 } : 'visible'}
      variants={onboardingEntranceVariants(reducedMotion)}
      transition={onboardingEntranceTransition(ONBOARDING_DELAYS[delay], reducedMotion)}
      onAnimationComplete={() => setEntranceSettled(true)}
      style={entranceSettled ? { transform: 'none' } : undefined}>
      {children}
    </motion.div>
  );
};

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
