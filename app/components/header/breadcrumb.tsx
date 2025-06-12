import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Breadcrumb as BreadcrumbUI,
} from '@/components/ui/breadcrumb';
import { UIMatch, useLocation } from 'react-router';
import { Fragment } from 'react/jsx-runtime';

export type BreadcrumbMatch = UIMatch<
  Record<string, unknown>,
  { breadcrumb: (data?: unknown) => React.ReactNode }
>;

export const Breadcrumb = ({ items }: { items: BreadcrumbMatch[] }) => {
  const location = useLocation();

  return (
    <BreadcrumbUI>
      <BreadcrumbList>
        {items.map((match, index) => (
          <Fragment key={`breadcrumb-${match.pathname}`}>
            <BreadcrumbItem>
              {location.pathname === match.pathname ? (
                <BreadcrumbPage className="font-medium">
                  {match.handle?.breadcrumb(match)}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={match.pathname} className="font-medium">
                  {match.handle?.breadcrumb(match)}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index !== items.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </BreadcrumbUI>
  );
};
