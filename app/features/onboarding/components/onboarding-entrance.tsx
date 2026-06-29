import {
  ONBOARDING_DELAYS,
  onboardingEntranceTransition,
  onboardingEntranceVariants,
  onboardingStaggerTransition,
  onboardingStaggerVariants,
} from '../onboarding-motion';
import { cn } from '@datum-cloud/datum-ui/utils';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

type OnboardingEntranceProps = {
  children: ReactNode;
  className?: string;
  delay?: 0 | 1 | 2 | 3;
};

export const OnboardingEntrance = ({ children, className, delay = 0 }: OnboardingEntranceProps) => {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={onboardingEntranceVariants(reducedMotion)}
      transition={onboardingEntranceTransition(ONBOARDING_DELAYS[delay], reducedMotion)}>
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
