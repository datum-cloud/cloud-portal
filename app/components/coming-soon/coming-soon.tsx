import { LogoIcon } from '@/components/logo/logo-icon';

export const ComingSoon = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center space-y-2 p-8 text-center">
      <LogoIcon width={64} className="mb-4" />
      <h2 className="text-2xl font-semibold">Coming Soon</h2>
      <p className="text-muted-foreground">
        This feature is currently under development. Check back later!
      </p>
    </div>
  );
};
