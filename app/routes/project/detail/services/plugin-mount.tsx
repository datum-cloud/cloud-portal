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
 * server-only imports (`getPlugin`, `gateRouteAccess`) are used exclusively
 * inside `loader`, which React Router's Vite plugin strips from the client
 * bundle along with their now-unused import chains (the same pattern the
 * project-detail layout uses for `runDetailLoader`). The default export is the
 * client render surface — `<PluginOutlet>`.
 */
import { logger } from '@/modules/logger';
import { getPageExtensions, matchPluginPage } from '@/modules/plugins/client/match-extension';
import { PluginOutlet } from '@/modules/plugins/client/plugin-outlet';
import { getPlugin, toPublicPlugin } from '@/modules/plugins/server';
import type { PluginRegistryEntry } from '@/modules/plugins/types';
import { gateRouteAccess } from '@/modules/rbac/server/check-permission';
import type { SupportedVerb } from '@/resources/access-review';
import { AuthorizationError, NotFoundError } from '@/utils/errors/app-error';
import { withLoaderErrors } from '@/utils/errors/loader';
import { metaObject } from '@/utils/helpers/meta.helper';
import { data, useLoaderData, type LoaderFunctionArgs, type MetaFunction } from 'react-router';

/**
 * Entitlement gate for the current project. Dev-sourced plugins skip this
 * entirely (handled by the caller). For entitlement-required plugins the check
 * is fail-closed: a project is only entitled if it has an Active
 * ServiceEntitlement for the service.
 *
 * TODO(portal-core): the ServiceEntitlement lookup against the project's
 * control plane lives on the server registry side. Until it's wired, a
 * non-dev entitlement-required plugin is invisible (fail-closed) — which is the
 * correct default and is moot in v1, where only dev sources populate the
 * registry (platform source is out of scope).
 */
async function isProjectEntitled(_projectId: string, entry: PluginRegistryEntry): Promise<boolean> {
  if (entry.spec.visibility.entitlement !== 'Required') return true;
  return false;
}

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

  // Entitlement — skipped for dev plugins (the remote catalog has no
  // ServiceEntitlement for a service that doesn't exist yet).
  if (!entry.devMode) {
    const entitled = await isProjectEntitled(projectId, entry);
    if (!entitled) {
      throw new NotFoundError('Service', serviceSlug);
    }
  }

  // RBAC — gate the extension matching the requested path. A path that matches
  // no page extension is not gated here; the client renders in-app 404 for it.
  const match = matchPluginPage(getPageExtensions(entry.manifest), splat);
  if (match) {
    const permissions = match.page.requirements?.permissions ?? [];
    for (const permission of permissions) {
      const allowed = await gateRouteAccess(projectId, {
        resource: permission.resource,
        verb: permission.verb as SupportedVerb,
        group: permission.group,
        scope: 'project',
        projectId,
      });
      if (!allowed) {
        if (entry.devMode) {
          // Dev posture: the service's RBAC may not be deployed remotely, so
          // surface denial as a warning rather than blocking the load.
          logger.warn('[plugins] dev plugin RBAC check failed (allowed in dev)', {
            slug: serviceSlug,
            resource: permission.resource,
            verb: permission.verb,
            group: permission.group,
          });
        } else {
          throw new AuthorizationError('You do not have permission to view this page');
        }
      }
    }
  }

  const plugin = toPublicPlugin(entry);
  if (!plugin) {
    throw new NotFoundError('Service', serviceSlug);
  }

  return data({ plugin });
});

export const meta: MetaFunction<typeof loader> = ({ data: loaderData }) => {
  return metaObject(loaderData?.plugin.displayName ?? 'Service');
};

export default function PluginMount() {
  const { plugin } = useLoaderData<typeof loader>();
  return <PluginOutlet plugin={plugin} />;
}
