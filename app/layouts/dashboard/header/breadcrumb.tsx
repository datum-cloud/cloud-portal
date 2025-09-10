import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Breadcrumb as BreadcrumbUI,
} from '@/components/ui/breadcrumb';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import React, { useMemo } from 'react';
import { useLocation, useMatches, useParams } from 'react-router';

/**
 * Type for route handle with breadcrumb function
 */
interface _RouteHandleWithBreadcrumb {
  breadcrumb: (data?: unknown) => React.ReactNode;
}

/**
 * Interface for breadcrumb item
 */
interface BreadcrumbItem {
  key: string;
  path: string;
  content: React.ReactNode;
  isCurrentPath: boolean;
  isLast: boolean;
}

/**
 * Enhanced Breadcrumb component that gets route matches directly
 * and renders a breadcrumb navigation based on route data
 */
export const Breadcrumb = (): React.ReactElement | null => {
  const params = useParams<{ orgId: string; projectId: string }>();
  const location = useLocation();
  const matches = useMatches();

  // Memoize the breadcrumb items to prevent unnecessary re-renders
  const items = useMemo<BreadcrumbItem[]>(() => {
    const filteredMatches = matches
      // Filter routes that have a breadcrumb in their handle
      .filter((match: any) => Boolean(match.handle?.breadcrumb))
      // Map to the processed breadcrumb items
      .map((match: any, index, filteredMatches) => {
        const isCurrentPath =
          match.pathname.includes(location.pathname) || match.pathname === location.pathname;
        const isLast = index === filteredMatches.length - 1;

        return {
          key: `breadcrumb-${match.pathname}`,
          path: match.pathname,
          content: match.handle.breadcrumb(match.data),
          isCurrentPath,
          isLast,
        };
      });

    if ((params.orgId || params.projectId) && !location.pathname.includes('/dashboard')) {
      const route = params?.projectId ? paths.projects.dashboard : paths.org.detail.projects.root;
      filteredMatches.unshift({
        key: `breadcrumb-dashboard`,
        path: getPathWithParams(route, { orgId: params.orgId, projectId: params.projectId }),
        content: <BreadcrumbPage className="font-medium">Dashboard</BreadcrumbPage>,
        isCurrentPath: location.pathname.includes('/dashboard'),
        isLast: filteredMatches.length === 0,
      });
    }

    return filteredMatches;
  }, [matches, location.pathname]);

  // If there are no breadcrumb items, don't render anything
  if (!items.length) return null;

  return (
    <BreadcrumbUI>
      <BreadcrumbList>
        {items.map((item) => (
          <React.Fragment key={item.key}>
            <BreadcrumbItem>
              {item.isCurrentPath ? (
                <BreadcrumbPage className="font-medium">{item.content}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  href={item.path}
                  className="[&>span]:text-muted-foreground [&>span]:hover:text-foreground cursor-pointer transition-all">
                  {item.content}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!item.isLast && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </BreadcrumbUI>
  );
};
