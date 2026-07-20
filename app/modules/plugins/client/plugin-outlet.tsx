/**
 * `<PluginOutlet>` — the client render surface of the plugin mount.
 *
 * Given a plugin resolved + gated by the mount loader, it renders the plugin's
 * pages through a nested react-router `<Routes>` built from the manifest's
 * `portal.page/project` extensions. Because react-router is a host-pinned
 * shared singleton, this makes `useParams`, `Link`, and `useNavigate` behave
 * identically inside plugin pages — including the plugin's own `:params`, which
 * the host mount route (`services/:serviceSlug/*`) cannot express.
 *
 * Each page lazy-loads its `$codeRef` through Module Federation only when
 * navigated to, inside a Suspense skeleton, and the whole subtree is wrapped in
 * a {@link PluginErrorBoundary} so a plugin crash degrades to a friendly card
 * instead of taking down the portal shell. Unmatched paths render in-app 404
 * content.
 */
import { DevPluginBadge } from './dev-plugin-badge';
import type { PluginRemoteRef } from './federation-host';
import { LazyPluginComponent } from './lazy-plugin-component';
import { getPageExtensions, normalizePagePath } from './match-extension';
import { PluginErrorBoundary } from './plugin-error-boundary';
import type { PublicPlugin } from '@/modules/plugins/types';
import { paths } from '@/utils/config/paths.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { FileQuestion } from 'lucide-react';
import { useMemo } from 'react';
import { Link, Route, Routes, useLocation, useParams } from 'react-router';

function PluginPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-64 w-full rounded-lg border" />
    </div>
  );
}

function PluginPage({ pluginRef, codeRef }: { pluginRef: PluginRemoteRef; codeRef: string }) {
  return (
    <div data-testid="plugin-page" className="flex flex-1 flex-col">
      <LazyPluginComponent
        pluginRef={pluginRef}
        codeRef={codeRef}
        fallback={<PluginPageSkeleton />}
      />
    </div>
  );
}

function PluginNotFound({ projectId }: { projectId?: string }) {
  return (
    <div data-testid="plugin-not-found" className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
            <Icon icon={FileQuestion} className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold">Page not found</p>
            <p className="text-muted-foreground text-sm">
              This service has no page at that address.
            </p>
          </div>
          {projectId && (
            <Link to={paths.project.detail.home.replace('[projectId]', projectId)}>
              <Button htmlType="button" type="primary" theme="solid" size="small">
                Back to project
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PluginOutlet({ plugin }: { plugin: PublicPlugin }) {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();

  const pages = useMemo(() => getPageExtensions(plugin.manifest), [plugin.manifest]);
  const pluginRef = useMemo<PluginRemoteRef>(
    () => ({
      remoteName: plugin.manifest.name,
      slug: plugin.slug,
      remoteEntry: plugin.manifest.remoteEntry,
    }),
    [plugin.manifest.name, plugin.slug, plugin.manifest.remoteEntry]
  );

  return (
    <div className="relative flex flex-1 flex-col">
      {plugin.devMode && (
        <div className="flex justify-end px-6 pt-4">
          <DevPluginBadge />
        </div>
      )}
      <PluginErrorBoundary
        slug={plugin.slug}
        displayName={plugin.displayName}
        resetKey={location.pathname}>
        <Routes>
          {pages.map((page) => {
            const path = normalizePagePath(page.properties.path);
            const element = (
              <PluginPage pluginRef={pluginRef} codeRef={page.properties.component.$codeRef} />
            );
            // An empty page path is the plugin's index at the mount root.
            return path === '' ? (
              <Route key="__index__" index element={element} />
            ) : (
              <Route key={path} path={path} element={element} />
            );
          })}
          <Route path="*" element={<PluginNotFound projectId={projectId} />} />
        </Routes>
      </PluginErrorBoundary>
    </div>
  );
}
