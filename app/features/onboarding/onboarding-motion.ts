import type { Transition, Variants } from 'motion/react';

export const onboardingEaseOut = [0.23, 1, 0.32, 1] as const;

export const onboardingStaggerVariants = (reduced: boolean): Variants => ({
  hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 6 },
  visible: reduced ? { opacity: 1 } : { opacity: 1, y: 0 },
});

export const onboardingStaggerTransition = (index: number, reduced: boolean): Transition => ({
  duration: reduced ? 0.15 : 0.35,
  delay: reduced ? 0 : index * 0.2,
  ease: onboardingEaseOut,
});

export const onboardingDecorationVariants = (reduced: boolean): Variants => ({
  hidden: reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 },
  visible: reduced ? { opacity: 1 } : { opacity: 1, scale: 1 },
});

export const onboardingDecorationTransition = (reduced: boolean): Transition => ({
  duration: reduced ? 0.15 : 0.28,
  ease: onboardingEaseOut,
});

export const onboardingStepPopTransition = (reduced: boolean): Transition => ({
  duration: reduced ? 0 : 0.24,
  ease: onboardingEaseOut,
});

export const onboardingCrossfadeVariants = (reduced: boolean): Variants => ({
  initial: reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 },
  animate: reduced ? { opacity: 1 } : { opacity: 1, scale: 1 },
  exit: reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 },
});

export const onboardingCrossfadeTransition = (reduced: boolean): Transition => ({
  duration: reduced ? 0.15 : 0.28,
  ease: onboardingEaseOut,
});
