/**
 * Plugin mount — the portal's permanent catch-all for service UI plugins
 * (`/project/:projectId/services/:serviceSlug/*`). One static route; plugin
 * content resolves inside it at runtime, so the compiled route tree never
 * changes per plugin (see docs/enhancements/portal-plugin-system.md,
 * "Loading plugins in the portal").
 *
 * The server `loader` does everything trust-sensitive before a single plugin
 * byte reaches the browser — slug → registry resolution, entitlement gating,
 * and per-extension RBAC — and returns only the sanitized `PublicPlugin`. Its
 * server-only imports (`getPlugin`, `assertPluginEntitled`, `canInLoaderBulk`)
 * are used exclusively inside `loader`, which React Router's Vite plugin strips
 * from the client bundle along with their now-unused import chains (the same
 * pattern the project-detail layout uses for `runDetailLoader`). The default
 * export is the client render surface — `<PluginOutlet>`.
 */
import { logger } from '@/modules/logger';
import {
  getPageExtensions,
  isBarePage,
  matchPluginPage,
} from '@/modules/plugins/client/match-extension';
import { PluginOutlet } from '@/modules/plugins/client/plugin-outlet';
import { getPlugin, toPublicPlugin } from '@/modules/plugins/server';
import { assertPluginEntitled } from '@/modules/plugins/server/entitlement';
import {
  canInLoaderBulk,
  recordGateDenial,
  type LoaderPermissionCheck,
} from '@/modules/rbac/server/check-permission';
import type { SupportedVerb } from '@/resources/access-review';
import { AuthorizationError, NotFoundError } from '@/utils/errors/app-error';
import { withLoaderErrors } from '@/utils/errors/loader';
import { metaObject } from '@/utils/helpers/meta.helper';
import { data, useLoaderData, type LoaderFunctionArgs, type MetaFunction } from 'react-router';

export const loader = withLoaderErrors(async (args: LoaderFunctionArgs) => {
  const { projectId, serviceSlug } = args.params;
  const splat = args.params['*'] ?? '';

  if (!projectId || !serviceSlug) {
    throw new NotFoundError('Service', serviceSlug ?? '');
  }

  // Slug → registry. `getPlugin` returns undefined for unknown, suspended, or
  // not-Ready plugins — fail closed with a 404 that reveals nothing.
  const entry = getPlugin(serviceSlug);
  if (!entry || !entry.manifest) {
    throw new NotFoundError('Service', serviceSlug);
  }

  // Entitlement — an Active ServiceEntitlement for the plugin's service, looked
  // up with the caller's session and cached per caller and project for a
  // minute. Not entitled → the same 404 as an unknown slug; a failed lookup
  // throws (fail closed). Dev plugins skip it inside the helper.
  await assertPluginEntitled(projectId, entry);

  // RBAC — gate the extension matching the requested path. A path that matches
  // no page extension is not gated here; the client renders in-app 404 for it.
  const match = matchPluginPage(getPageExtensions(entry.manifest), splat);
  if (match) {
    // A manifest declares an unbounded number of permissions, and each one used
    // to be its own sequential access review — so a slow upstream multiplied
    // straight through the page load. One fan-out instead.
    const checks: LoaderPermissionCheck[] = (match.page.requirements?.permissions ?? []).map(
      (permission) => ({
        resource: permission.resource,
        verb: permission.verb as SupportedVerb,
        group: permission.group,
        scope: 'project' as const,
        projectId,
      })
    );

    const verdicts = await canInLoaderBulk(projectId, checks);

    // Verdicts are consumed in declaration order, so the first denial is the one
    // that throws and later permissions go unrecorded — exactly as the
    // sequential loop short-circuited. In devMode nothing throws, so every
    // denial is still warned about individually.
    for (const [index, check] of checks.entries()) {
      if (verdicts[index] ?? false) {
        continue;
      }
      recordGateDenial(check);
      if (entry.devMode) {
        // Dev posture: the service's RBAC may not be deployed remotely, so
        // surface denial as a warning rather than blocking the load.
        logger.warn('[plugins] dev plugin RBAC check failed (allowed in dev)', {
          slug: serviceSlug,
          resource: check.resource,
          verb: check.verb,
          group: check.group,
        });
        continue;
      }
      throw new AuthorizationError('You do not have permission to view this page');
    }
  }

  const plugin = toPublicPlugin(entry);
  if (!plugin) {
    throw new NotFoundError('Service', serviceSlug);
  }

  return data({ plugin, bare: isBarePage(match) });
});

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => {
  return metaObject(loaderData?.plugin.displayName ?? 'Service');
};

export default function PluginMount() {
  const { plugin } = useLoaderData<typeof loader>();
  return <PluginOutlet plugin={plugin} />;
}
