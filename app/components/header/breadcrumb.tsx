import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Breadcrumb as BreadcrumbUI,
} from '@shadcn/ui/breadcrumb';
import { Home } from 'lucide-react';
import React, { useMemo } from 'react';
import { useLocation, useMatches } from 'react-router';

/**
 * Type for route handle with breadcrumb options
 */
interface _RouteHandleWithBreadcrumb {
  breadcrumb: (data?: unknown) => React.ReactNode;
  /**
   * Optional path function to define the breadcrumb link destination.
   * If provided, this will be used instead of the route's pathname.
   * Receives the route data as parameter (falls back to parent route data if not available).
   */
  path?: (data?: unknown) => string;
  /**
   * Optional flag (or resolver) to hide breadcrumb completely for a specific route.
   * When true, the breadcrumb navigation won't render for that route.
   */
  hideBreadcrumb?: boolean | ((data?: unknown) => boolean);
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
  const location = useLocation();
  const matches = useMatches();

  // Memoize the breadcrumb items to prevent unnecessary re-renders
  const items = useMemo<BreadcrumbItem[]>(() => {
    const matchesWithBreadcrumb = matches.filter((match: any) => Boolean(match.handle?.breadcrumb));

    return matchesWithBreadcrumb.map((match: any, index) => {
      const isCurrentPath =
        match.pathname.includes(location.pathname) || match.pathname === location.pathname;
      const isLast = index === matchesWithBreadcrumb.length - 1;

      // Determine the path to use for this breadcrumb item
      let path = match.pathname;

      // If handle.path is defined, use it (explicit override)
      if (match.handle?.path) {
        // Try to get data from current match, or fall back to parent match data
        const matchIndex = matches.indexOf(match);
        const fallbackData =
          matchIndex > 0
            ? [...matches]
                .slice(0, matchIndex)
                .reverse()
                .find((parentMatch) => parentMatch.data)?.data
            : undefined;
        const routeData = match.data ?? fallbackData;
        path = match.handle.path(routeData);
      }

      return {
        key: `breadcrumb-${match.pathname || match.id || index}`,
        path,
        content: match.handle.breadcrumb(match.data),
        isCurrentPath,
        isLast,
      };
    });
  }, [matches, location.pathname]);

  // Check if breadcrumb should be hidden for the active route
  const activeMatch = matches[matches.length - 1];
  const activeHandle = activeMatch?.handle as _RouteHandleWithBreadcrumb | undefined;
  const shouldHideBreadcrumb =
    typeof activeHandle?.hideBreadcrumb === 'function'
      ? activeHandle.hideBreadcrumb(activeMatch.data)
      : Boolean(activeHandle?.hideBreadcrumb);

  if (shouldHideBreadcrumb) return null;

  // If there are no breadcrumb items, don't render anything
  if (items?.length <= 1) return null;

  return (
    <BreadcrumbUI>
      <BreadcrumbList className="gap-[5px] sm:gap-[5px]">
        <BreadcrumbItem>
          <BreadcrumbLink
            href="/"
            className="text-primary hover:text-secondary mr-2 cursor-pointer transition-all">
            <Home size={16} />
          </BreadcrumbLink>
        </BreadcrumbItem>

        {items.map((item) => (
          <React.Fragment key={item.key}>
            <BreadcrumbItem>
              {item.isCurrentPath ? (
                <BreadcrumbPage className="[&>span]:text-foreground">{item.content}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  href={item.path}
                  className="[&>span]:text-foreground [&>span]:hover:text-primary cursor-pointer transition-all">
                  {item.content}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!item.isLast && <BreadcrumbSeparator>/</BreadcrumbSeparator>}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </BreadcrumbUI>
  );
};
