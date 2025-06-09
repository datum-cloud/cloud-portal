import { LogoIcon } from '@/components/logo/logo-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { routes } from '@/constants/routes';
import { isDevelopment } from '@/utils/helpers/misc.helper';
import { HomeIcon, Loader2, RefreshCcwIcon } from 'lucide-react';
import NProgress from 'nprogress';
import { JSX, useEffect, useState } from 'react';
import type { ErrorResponse } from 'react-router';
import {
  Link,
  isRouteErrorResponse,
  useFetcher,
  useNavigate,
  useParams,
  useRouteError,
} from 'react-router';

type StatusHandler = (info: {
  error: ErrorResponse;
  params: Record<string, string | undefined>;
}) => JSX.Element | null;

type GenericErrorBoundaryProps = {
  defaultStatusHandler?: StatusHandler;
  statusHandlers?: Record<number, StatusHandler>;
  unexpectedErrorHandler?: (error: unknown) => JSX.Element | null;
};

export function GenericErrorBoundary({
  statusHandlers,
  defaultStatusHandler = ({ error }) => <p>{error.statusText ? error.statusText : error.data}</p>,
  unexpectedErrorHandler = (error) => <p>{getErrorMessage(error)}</p>,
}: GenericErrorBoundaryProps) {
  const params = useParams();
  const error = useRouteError();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>(
    "We've encountered a problem, please try again. Sorry!"
  );

  if (typeof document !== 'undefined') {
    console.error(error);
  }

  useEffect(() => {
    NProgress.done();

    console.log(error);

    if (isRouteErrorResponse(error)) {
      if (error.statusText === 'AUTH_ERROR') {
        console.log(error.data.message);
        if ((error.data.message as string).toLowerCase().includes('session expired')) {
          console.log('molla');
          navigate(routes.auth.logOut);
        } else {
          setMessage(error.data.message);
        }
      } else {
        setMessage(`${error.status} ${error.statusText}`);
      }
    } else if (error instanceof Error) {
      setMessage(error.message);
    }

    setIsLoading(false);
  }, [error]);

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <Card className="overflow-hidden">
          <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
            <LogoIcon width={64} className="mb-4" />
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <>
                <div className="flex max-w-xl flex-col gap-2">
                  <p className="w-full text-center text-2xl font-bold">
                    Whoops! Something went wrong.
                  </p>

                  {isDevelopment() ? (
                    <div className="text-muted-foreground text-center text-sm">
                      {isRouteErrorResponse(error)
                        ? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
                            error,
                            params,
                          })
                        : unexpectedErrorHandler(error)}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center text-sm">
                      Something went wrong on our end. Our team has been notified, and we&apos;re
                      working to fix it. Please try again later. If the issue persists, reach out to{' '}
                      <Link to={`mailto:support@datum.net`} className="text-primary underline">
                        support@datum.net
                      </Link>
                      .
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link to={routes.home}>
                    <Button size="sm">
                      <HomeIcon className="size-4" />
                      Back to Home
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigate(0);
                    }}>
                    <RefreshCcwIcon className="size-4" />
                    Refresh Page
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function getErrorMessage(err: unknown) {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  console.error('Unable to get error message for error:', err);
  return 'Unknown error';
}
