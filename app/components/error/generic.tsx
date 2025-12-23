import { LogoIcon } from '@/components/logo/logo-icon';
import { paths } from '@/utils/config/paths.config';
import { Button } from '@datum-ui/components';
import { Card, CardContent } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { HomeIcon, RefreshCcwIcon } from 'lucide-react';
// import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

export const GenericError = ({ message }: { message: string }) => {
  const navigate = useNavigate();
  // const [isDebug, setIsDebug] = useState(false);

  // useEffect(() => {
  //   setIsDebug(window.ENV?.DEBUG || ['localhost', '127.0.0.1'].includes(window.location.hostname));
  // }, []);

  return (
    <Card>
      <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
        <LogoIcon width={64} className="mb-4" />
        <div className="flex max-w-xl flex-col gap-2">
          <p className="w-full text-center text-2xl font-bold">Whoops! Something went wrong.</p>

          <p className="text-muted-foreground text-center text-sm">
            Something went wrong on our end. Our team has been notified, and we&apos;re working to
            fix it. Please try again later. If the issue persists, reach out to{' '}
            <Link to={`mailto:support@datum.net`} className="text-primary underline">
              support@datum.net
            </Link>
            .
          </p>
          {/* {isDebug && ( */}
          <div className="text-muted-foreground rounded-r-md border-l-4 border-red-500 bg-red-50 p-4 text-center text-sm dark:bg-red-950/20">
            {message}
          </div>
          {/* )} */}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            type="primary"
            theme="solid"
            icon={<Icon icon={HomeIcon} className="size-4" />}
            className="bg-primary hover:bg-primary/90 active:bg-primary/80"
            onClick={() => {
              navigate(paths.home);
            }}>
            Back to Home
          </Button>
          <Button
            type="quaternary"
            theme="outline"
            size="small"
            onClick={() => {
              navigate(0);
            }}>
            <Icon icon={RefreshCcwIcon} className="size-4" />
            Refresh Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
