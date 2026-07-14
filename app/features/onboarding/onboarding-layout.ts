/** Shared layout tokens for onboarding routes (mobile-first). */

/** Shared header bar — keeps logo and user menu vertically aligned on all breakpoints. */
export const onboardingHeaderClassName =
  'absolute inset-x-0 top-0 z-30 flex h-22 items-center justify-end px-6 md:justify-between md:px-[41px]';

export const onboardingLogoClassName =
  'absolute left-1/2 h-6 w-auto -translate-x-1/2 md:static md:translate-x-0';

export const onboardingContentClassName =
  'relative z-10 mx-auto flex w-full min-w-0 max-w-[410px] flex-1 flex-col justify-center px-4 py-20 md:max-w-[860px] md:px-0 md:py-24';

export const onboardingCardClassName =
  'bg-card text-foreground w-full min-w-0 rounded-xl border-none p-6 sm:p-8 md:p-[44px]';

export const onboardingSceneRightClassName =
  'pointer-events-none absolute right-0 bottom-0 z-0 w-[min(100%,280px)] sm:w-[min(100%,380px)] md:w-[min(100%,500px)] lg:w-[min(100%,800px)]';
