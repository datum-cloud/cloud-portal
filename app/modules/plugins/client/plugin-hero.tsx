/**
 * `portal.hero/project-home` selection and rendering — CLIENT-SAFE.
 *
 * The hero is the first step on an empty project's home page. Only one renders
 * at a time: the first by plugin order, then each plugin's own `order`. The
 * host decides when to show it (see `features/project/home/use-project-setup`)
 * and draws no chrome; the plugin's component is the whole card.
 */
import type { PluginRemoteRef } from './federation-host';
import { LazyPluginComponent } from './lazy-plugin-component';
import { getHeroExtensions } from './match-extension';
import { PluginErrorBoundary } from './plugin-error-boundary';
import { useActiveServiceEntitlements } from './use-active-service-entitlements';
import { useProjectPlugins } from './use-project-plugins';
import type { HeroProjectHomeExtension, PublicPlugin } from '@/modules/plugins/types';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { useMemo } from 'react';

export interface HomeHero {
  plugin: PublicPlugin;
  pluginRef: PluginRemoteRef;
  hero: HeroProjectHomeExtension;
}

/**
 * The hero to show, or undefined when no ready plugin contributes one. A hero
 * that declares `requirements.serviceRef` is skipped until the project has a
 * matching Active ServiceEntitlement, the same rule cards and columns follow.
 */
export function pickHomeHero(
  plugins: readonly PublicPlugin[],
  activeServices: ReadonlySet<string>
): HomeHero | undefined {
  for (const plugin of plugins) {
    const hero = getHeroExtensions(plugin.manifest).find((ext) => {
      const serviceRef = ext.requirements?.serviceRef?.trim();
      return !serviceRef || activeServices.has(serviceRef);
    });
    if (!hero) continue;
    return {
      plugin,
      pluginRef: {
        remoteName: plugin.manifest.name,
        slug: plugin.slug,
        remoteEntry: plugin.manifest.remoteEntry,
      },
      hero,
    };
  }
  return undefined;
}

/** The project home hero, and whether plugins are still loading. */
export function useProjectHomePluginHero(projectId: string): {
  hero: HomeHero | undefined;
  isLoading: boolean;
} {
  const { data: plugins, isLoading: pluginsLoading } = useProjectPlugins(projectId, {
    enabled: !!projectId,
  });
  const { data: activeServiceEntitlements, isLoading: entitlementsLoading } =
    useActiveServiceEntitlements(projectId, { enabled: !!projectId });

  const hero = useMemo(
    () => pickHomeHero(plugins ?? [], new Set(activeServiceEntitlements ?? [])),
    [plugins, activeServiceEntitlements]
  );

  return { hero, isLoading: pluginsLoading || entitlementsLoading };
}

/** Renders a picked hero, lazy-loaded and error-isolated like every plugin surface. */
export function ProjectHomePluginHero({ hero: { plugin, pluginRef, hero } }: { hero: HomeHero }) {
  const codeRef = hero.properties.component.$codeRef;
  return (
    <div data-testid={`project-home-hero-${plugin.slug}`}>
      <PluginErrorBoundary slug={plugin.slug} displayName={plugin.displayName} resetKey={codeRef}>
        <LazyPluginComponent
          pluginRef={pluginRef}
          codeRef={codeRef}
          fallback={<Skeleton className="h-96 w-full rounded-xl" />}
        />
      </PluginErrorBoundary>
    </div>
  );
}
