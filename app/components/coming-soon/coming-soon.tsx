import { LogoIcon } from '@/components/logo/logo-icon';
import { Title } from '@datum-cloud/datum-ui/typography';

export const ComingSoon = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center space-y-2 p-8 text-center">
      <LogoIcon width={64} className="mb-4" />
      <Title as="h2" level={3}>
        Coming Soon
      </Title>
      <p className="text-muted-foreground">
        This feature is currently under development. Check back later!
      </p>
    </div>
  );
};
