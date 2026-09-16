import type { ProxyBackend, ProxyRoute } from '@/resources/http-proxies';

/** How each backend kind reads in a row, a legend, or a confirm prompt. */
export function backendLabel(backend: ProxyBackend): string {
  switch (backend.kind) {
    case 'networkService':
      return backend.networkService
        ? `${backend.networkService.name} · ${backend.networkService.port}`
        : 'Network service';
    case 'connector':
      return backend.connector?.name ?? 'Connector';
    case 'instance':
      return backend.instance ? `${backend.instance.name}:${backend.instance.port}` : 'Instance';
    default:
      return backend.endpoint ?? '—';
  }
}

export const BACKEND_KIND_LABELS: Record<ProxyBackend['kind'], string> = {
  endpoint: 'URL',
  networkService: 'Network service',
  connector: 'Connector',
  instance: 'Instance',
};

/** The scheme of a URL backend, for the TLS chip. */
export function backendScheme(backend: ProxyBackend): 'https' | 'http' | undefined {
  if (!backend.endpoint) return undefined;
  try {
    const { protocol } = new URL(backend.endpoint);
    if (protocol === 'https:') return 'https';
    if (protocol === 'http:') return 'http';
  } catch {
    // Not parseable as a URL — say nothing rather than guess.
  }
  return undefined;
}

/** Routes the Backends tab shows: everything but the synthesized redirect. */
export function displayRoutes(routes: ProxyRoute[] | undefined): ProxyRoute[] {
  return (routes ?? []).filter((r) => !r.isRedirect);
}

/**
 * How a route's path reads. An absent path means the API's default, which is
 * every request.
 */
export function routePathLabel(route: ProxyRoute): string {
  if (!route.path) return '/';
  return route.path;
}

/**
 * The API requires a connector backend to be the only backend in its rule, so
 * the pool cannot be added to. Returned as a reason string so the disabled
 * control can explain itself rather than just being dead.
 */
export function addBackendBlockedReason(route: ProxyRoute): string | undefined {
  if (route.backends.some((b) => b.kind === 'connector')) {
    return 'A connector backend must be the only backend in its route.';
  }
  if (route.backends.length >= 16) {
    return 'A route can hold at most 16 backends.';
  }
  if (route.readOnly) {
    return 'This route uses matches or filters the portal cannot edit.';
  }
  return undefined;
}
