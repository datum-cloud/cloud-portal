import { LogoIcon } from '@/components/logo/logo-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { paths } from '@/utils/config/paths.config';
import { ArrowLeft, HomeIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, MetaFunction, useLocation, useNavigate } from 'react-router';

export const meta: MetaFunction = () => {
  return [
    { title: 'Page Not Found' },
    { name: 'description', content: 'The page you are looking for does not exist.' },
  ];
};

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDebug, setIsDebug] = useState(false);

  useEffect(() => {
    setIsDebug(window.ENV?.DEBUG || ['localhost', '127.0.0.1'].includes(window.location.hostname));
  }, [location]);

  return (
    <Card>
      <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
        <LogoIcon width={64} className="mb-4" />
        <div className="flex max-w-xl flex-col gap-2">
          <p className="w-full text-center text-2xl font-bold">Page Not Found</p>

          <p className="text-muted-foreground text-center text-sm">
            The page you are looking for doesn&apos;t exist. It might have been moved, deleted, or
            you entered the wrong URL.
          </p>
          {isDebug && (
            <div className="text-muted-foreground rounded-r-md border-l-4 border-yellow-500 bg-yellow-50 p-4 text-center text-sm dark:bg-yellow-950/20">
              Path: {location.pathname}
              {location.search && `?${location.search}`}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link to={paths.home}>
            <Button size="sm">
              <HomeIcon className="size-4" />
              Back to Home
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigate(-1);
            }}>
            <ArrowLeft className="size-4" />
            Go Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
