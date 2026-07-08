import { onboardingDecorationTransition, onboardingDecorationVariants } from '../onboarding-motion';
import { HandwritingText } from './handwriting-text';
import { cn } from '@datum-cloud/datum-ui/utils';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export type HandwritingWithDecorationProps = {
  text: string;
  textClassName?: string;
  textStyle?: CSSProperties;
  textWrapperClassName?: string;
  decorationClassName?: string;
  onDecorationVisible?: () => void;
  children: ReactNode;
};

export const HandwritingWithDecoration = ({
  text,
  textClassName,
  textStyle,
  textWrapperClassName,
  decorationClassName,
  onDecorationVisible,
  children,
}: HandwritingWithDecorationProps) => {
  const reducedMotion = useReducedMotion() ?? false;
  const [decorationVisible, setDecorationVisible] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setDecorationVisible(true);
      onDecorationVisible?.();
    }
  }, [reducedMotion, onDecorationVisible]);

  const revealDecoration = () => {
    setDecorationVisible(true);
    onDecorationVisible?.();
  };

  return (
    <>
      <span className={textWrapperClassName}>
        <HandwritingText
          text={text}
          className={textClassName}
          style={textStyle}
          onComplete={revealDecoration}
        />
      </span>
      <motion.div
        className={cn(decorationClassName)}
        aria-hidden
        initial="hidden"
        animate={decorationVisible ? 'visible' : 'hidden'}
        variants={onboardingDecorationVariants(reducedMotion)}
        transition={onboardingDecorationTransition(reducedMotion)}
        style={{ pointerEvents: 'none' }}>
        {children}
      </motion.div>
    </>
  );
};
