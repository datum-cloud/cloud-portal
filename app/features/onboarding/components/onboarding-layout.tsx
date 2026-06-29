import {
  onboardingContentClassName,
  onboardingLogoClassName,
  onboardingSceneRightClassName,
} from '../onboarding-layout';
import { LogoFlat } from '@/components/logo/logo-flat';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ReactNode } from 'react';

type OnboardingLayoutWidth = 'default' | 'wide' | 'full';

const widthClassName: Record<OnboardingLayoutWidth, string> = {
  default: 'max-w-[410px] md:max-w-[410px]',
  wide: 'max-w-[410px] md:max-w-[860px]',
  full: 'max-w-none md:max-w-none',
};

export type OnboardingLayoutProps = {
  children: ReactNode;
  /** Content width: single card (default), billing two-up (wide), or provisioning split (full). */
  width?: OnboardingLayoutWidth;
  contentClassName?: string;
  /** Full-viewport 50/50 background (white left, muted right) for provisioning split. */
  splitBackground?: boolean;
  /** Layer scene illustration above page content (provisioning). */
  sceneOnTop?: boolean;
};

const OnboardingScenes = ({ onTop }: { onTop?: boolean }) => (
  <div className={cn(onboardingSceneRightClassName, onTop && 'z-20')}>
    <img
      src="/images/scene-2.png"
      alt=""
      aria-hidden
      className="size-auto w-full object-cover object-bottom-right"
    />
  </div>
);

export const OnboardingLayout = ({
  children,
  width = 'default',
  contentClassName,
  splitBackground = false,
  sceneOnTop = false,
}: OnboardingLayoutProps) => (
  <div className="bg-background relative flex min-h-svh w-full flex-col overflow-x-hidden">
    {splitBackground && (
      <div className="pointer-events-none absolute inset-0 z-0 hidden md:block" aria-hidden>
        <div className="flex h-full">
          <div className="bg-card w-1/2" />
          <div className="bg-muted/30 w-1/2" />
        </div>
      </div>
    )}
    <LogoFlat className={onboardingLogoClassName} aria-label="Datum" />
    <div className={cn(onboardingContentClassName, widthClassName[width], contentClassName)}>
      {children}
    </div>
    <OnboardingScenes onTop={sceneOnTop} />
  </div>
);
