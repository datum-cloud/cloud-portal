/**
 * `portal.card/project-home` rendering — CLIENT-SAFE.
 *
 * Renders every ready plugin's project-home card extensions in a grid on the
 * project home page. Each card's component is lazy-loaded through Module
 * Federation, mount-gated and error-isolated exactly like plugin pages, so a
 * broken card degrades to a friendly message without disturbing the rest of the
 * home page.
 */
import type { PluginRemoteRef } from './federation-host';
import { LazyPluginComponent } from './lazy-plugin-component';
import { getCardExtensions } from './match-extension';
import { PluginErrorBoundary } from './plugin-error-boundary';
import { useActiveServiceEntitlements } from './use-active-service-entitlements';
import { useProjectPlugins } from './use-project-plugins';
import type { CardProjectHomeExtension, PublicPlugin } from '@/modules/plugins/types';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { useMemo } from 'react';

interface HomeCard {
  plugin: PublicPlugin;
  pluginRef: PluginRemoteRef;
  card: CardProjectHomeExtension;
}

export function collectHomeCards(plugins: PublicPlugin[]): HomeCard[] {
  return plugins.flatMap((plugin) => {
    const pluginRef: PluginRemoteRef = {
      remoteName: plugin.manifest.name,
      slug: plugin.slug,
      remoteEntry: plugin.manifest.remoteEntry,
    };
    return getCardExtensions(plugin.manifest).map((card) => ({ plugin, pluginRef, card }));
  });
}

/**
 * A card with `requirements.serviceRef` only renders once the project has an
 * Active ServiceEntitlement matching that id — otherwise the plugin isn't
 * entitled yet and the host skips the card entirely (title, chrome, and all)
 * rather than mounting a component that has nothing to show.
 */
export function isEntitled(card: HomeCard, activeServices: ReadonlySet<string>): boolean {
  const serviceRef = card.card.requirements?.serviceRef?.trim();
  if (!serviceRef) return true;
  return activeServices.has(serviceRef);
}

/**
 * Project-home cards contributed by plugins. Renders nothing until at least one
 * ready, entitled plugin declares a `portal.card/project-home` extension, so
 * the home page is unchanged when no plugins are present or none are entitled.
 */
export function ProjectHomePluginCards({ projectId }: { projectId: string }) {
  const { data: plugins } = useProjectPlugins(projectId, { enabled: !!projectId });
  const { data: activeServiceEntitlements } = useActiveServiceEntitlements(projectId, {
    enabled: !!projectId,
  });
  const activeServices = useMemo(
    () => new Set(activeServiceEntitlements ?? []),
    [activeServiceEntitlements]
  );
  const cards = useMemo(() => {
    if (!plugins) return [];
    return collectHomeCards(plugins).filter((card) => isEntitled(card, activeServices));
  }, [plugins, activeServices]);

  if (cards.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(({ plugin, pluginRef, card }) => (
        <Card key={`${plugin.slug}:${card.properties.component.$codeRef}`}>
          <CardHeader>
            <CardTitle>{card.properties.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <PluginErrorBoundary
              slug={plugin.slug}
              displayName={plugin.displayName}
              resetKey={card.properties.component.$codeRef}>
              <LazyPluginComponent
                pluginRef={pluginRef}
                codeRef={card.properties.component.$codeRef}
                fallback={<Skeleton className="h-24 w-full rounded-lg" />}
              />
            </PluginErrorBoundary>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
