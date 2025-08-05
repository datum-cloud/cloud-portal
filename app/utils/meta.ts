import { SITE_CONFIG } from '@/config/site';
import { ClientLoaderFunction, LoaderFunction, MetaDescriptor, MetaFunction } from 'react-router';

// Define the types that were previously imported from 'react-router/route-module'
type MetaDescriptors = Array<MetaDescriptor>;

type CreateMetaArgs<RouteData = any> = {
  data: RouteData;
  params: Record<string, string>;
  location: Location;
  matches: Array<{
    meta: MetaDescriptor[];
    [key: string]: unknown;
  }>;
};

/**
 * Merging helper for React Router meta tags
 *
 * {@link https://remix.run/docs/en/main/route/meta#meta-merging-helper}
 *
 * If you can't avoid the merge problem with global meta or index routes, we've created
 * a helper that you can put in your app that can override and append to parent meta easily.
 *
 * @example
 * ```typescript
 * import type { MetaFunction } from 'react-router';
 *
 * import { mergeMeta } from '~/utils/web';
 *
 * export const meta: MetaFunction<typeof loader> = mergeMeta(({ data }) => {
 *   return [
 *     { title: "My Leaf Route" },
 *   ];
 * });
 *
 * // In a parent route:
 * import type { MetaFunction } from 'react-router';
 *
 * export const meta: MetaFunction<typeof loader> = ({ data }) => {
 *   return [
 *     { title: "My Parent Route" },
 *     { name: 'description', content: "This is the parent route" },
 *   ];
 * }
 * ```
 * The resulting meta will contain both `title: 'My Leaf Route'` and `description: 'This is the parent route'`.
 */
export function mergeMeta<
  Loader extends LoaderFunction | ClientLoaderFunction | unknown = unknown,
  ParentsLoaders extends Record<string, LoaderFunction | ClientLoaderFunction | unknown> = Record<
    string,
    unknown
  >,
>(leafMetaFn: MetaFunction<Loader, ParentsLoaders>): MetaFunction<Loader, ParentsLoaders> {
  return (args) => {
    const leafMeta = leafMetaFn(args);

    return args.matches.reduceRight((acc, match) => {
      for (const parentMeta of match.meta) {
        addUniqueMeta(acc, parentMeta);
      }

      return acc;
    }, leafMeta);
  };
}

/**
 * Merging helper that works with Route Module Type Safety
 *
 * If you can't avoid the merge problem with global meta or index routes, we've created
 * a helper that you can put in your app that can override and append to parent meta easily.
 *
 * @example
 * ```typescript
 * import type { Route } from './+types/leaf';
 *
 * import { mergeRouteModuleMeta } from '~/utils/web';
 *
 * export const meta: Route.MetaFunction = mergeRouteModuleMeta(({ data }) => {
 *   return [
 *     { title: "My Leaf Route" },
 *   ];
 * });
 *
 * // In a parent route:
 * import type { Route } from './+types/root';
 *
 * export const meta: Route.MetaFunction = ({ data }) => {
 *   return [
 *     { title: "My Parent Route" },
 *     { name: 'description', content: "This is the parent route" },
 *   ];
 * }
 * ```
 * The resulting meta will contain both `title: 'My Leaf Route'` and `description: 'This is the parent route'`.
 */
export function mergeRouteModuleMeta<TMetaArgs extends CreateMetaArgs<any>>(
  leafMetaFn: (args: TMetaArgs) => MetaDescriptors
): (args: TMetaArgs) => MetaDescriptors {
  return (args) => {
    const leafMeta = leafMetaFn(args);

    return args.matches.reduceRight((acc: MetaDescriptor[], match: any) => {
      for (const parentMeta of match?.meta ?? []) {
        addUniqueMeta(acc, parentMeta);
      }

      return acc;
    }, leafMeta);
  };
}

/**
 * Adds a meta descriptor to the accumulator if it's not already present
 * @param acc - The accumulator array of meta descriptors
 * @param parentMeta - The meta descriptor to add
 */
function addUniqueMeta(acc: MetaDescriptor[] | undefined, parentMeta: MetaDescriptor) {
  if (acc?.findIndex((meta) => isMetaEqual(meta, parentMeta)) === -1) {
    acc.push(parentMeta);
  }
}

/**
 * Checks if two meta descriptors are equal
 * @param meta1 - First meta descriptor
 * @param meta2 - Second meta descriptor
 * @returns Boolean indicating if the meta descriptors are equal
 */
function isMetaEqual(meta1: MetaDescriptor, meta2: MetaDescriptor): boolean {
  return (
    ('name' in meta1 && 'name' in meta2 && meta1.name === meta2.name) ||
    ('property' in meta1 && 'property' in meta2 && meta1.property === meta2.property) ||
    ('title' in meta1 && 'title' in meta2) ||
    /**
     * Final attempt where some meta slips through the above checks and duplication is still possible.
     *
     * E.g. `{ href: "https://example.com/my-stylesheet/${aDynamicOrgId}", rel: "stylesheet", tagName: "link" }` where
     * we wouldn't want two of the same link to exist.
     */
    JSON.stringify(meta1) === JSON.stringify(meta2)
  );
}

/**
 * Creates a standardized meta object for SEO and social sharing
 * @param title - The page title (will be prefixed with site title)
 * @param description - The page description (defaults to site description)
 * @returns Array of meta descriptors for the page
 */
export function metaObject(title?: string, description?: string): MetaDescriptor[] {
  const formattedTitle = title ? `${SITE_CONFIG.siteTitle} - ${title}` : SITE_CONFIG.siteTitle;
  const formattedDescription = description ?? SITE_CONFIG.siteDescription;
  const ogImage = `${SITE_CONFIG.siteUrl}/og-image.jpg`;

  return [
    { title: formattedTitle },
    { name: 'description', content: formattedDescription },
    { property: 'og:title', content: formattedTitle },
    { property: 'og:description', content: formattedDescription },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: SITE_CONFIG.siteUrl },
    { property: 'og:image', content: ogImage },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: formattedTitle },
    { name: 'twitter:description', content: formattedDescription },
    { name: 'twitter:image', content: ogImage },
  ];
}
