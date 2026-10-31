import { HomeColumns } from './home-columns';
import { findNetworksPlugin } from './home-mode';
import { InlinePatch } from './inline-patch';
import { NetworkSummary } from './network-summary';
import { NextSuggestions } from './next-suggestions';
import { PathChoice, type BuildTool } from './path-choice';
import { PluginCreateNetworkDialog } from './plugin-create-network-dialog';
import { ProjectHealth } from './project-health';
import { hasVisibleResources } from './setup-progress.helpers';
import { useCreatedToasts } from './use-created-toasts';
import { usePatch } from './use-patch';
import { useProjectSetup } from './use-project-setup';
import { AddDomainsDialog } from '@/features/edge/domain/add';
import {
  HttpProxyFormDialog,
  type HttpProxyFormDialogRef,
} from '@/features/edge/proxy/proxy-form-dialog';
import type { DockPrompt } from '@/features/project-dock/project-dock-context';
import { ProjectSearchBar } from '@/features/search/surfaces/ProjectSearchBar';
import { useHydrated } from '@/hooks/useHydrated';
import {
  ProjectHomePluginHero,
  useProjectHomePluginHero,
} from '@/modules/plugins/client/plugin-hero';
import { useProjectPlugins } from '@/modules/plugins/client/use-project-plugins';
import { pluginHref } from '@/modules/project-nav/merge-plugin-nav';
import { AnalyticsAction, useAnalytics } from '@/modules/rybbit';
import { networkKeys, useNetworks } from '@/resources/networks';
import { Button } from '@datum-cloud/datum-ui/button';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

/**
 * The part of the project home page that changes with first-run setup. An
 * empty project leads with the network hero a plugin contributes; once there
 * is a network ready, the toolbox and Patch are offered side by side until the
 * project has anything else. From then until a load balancer is serving, a
 * "next step" card sits above the usual resource columns. Established projects
 * see none of it, and with no hero plugin installed the page is as before.
 *
 * The health line is left out while the project has nothing in it: "everything
 * looks healthy" says nothing when nothing is running.
 */
export function ProjectHomeBody({ projectId }: { projectId: string }) {
  const setup = useProjectSetup(projectId);
  const { hero, isLoading: heroLoading } = useProjectHomePluginHero(projectId);
  // The server always renders the loading state, so the hydration render must
  // too, even when queries other components started have already resolved.
  const hydrated = useHydrated();
  const loading = !hydrated || setup.isLoading || heroLoading;
  const { trackAction } = useAnalytics();
  const patch = usePatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const created = useCreatedToasts(projectId);
  // The path choice's tools open these. They live here so they stay open when
  // creating something ends the path choice underneath them.
  const proxyFormRef = useRef<HttpProxyFormDialogRef>(null);
  const [domainOpen, setDomainOpen] = useState(false);
  const onTool = (tool: BuildTool) => {
    trackAction(AnalyticsAction.FirstRunToolboxAction);
    if (tool === 'loadBalancer') proxyFormRef.current?.show();
    if (tool === 'domain') setDomainOpen(true);
  };

  const showHero = setup.showNetworkHero && !!hero;

  // A network appearing while the hero is up means the hero created it.
  const heroShownRef = useRef(false);
  const createTrackedRef = useRef(false);
  useEffect(() => {
    if (showHero) heroShownRef.current = true;
  }, [showHero]);
  useEffect(() => {
    if (!heroShownRef.current || !setup.hasNetwork || createTrackedRef.current) return;
    createTrackedRef.current = true;
    trackAction(AnalyticsAction.CreateNetworkFirstRun);
  }, [setup.hasNetwork, trackAction]);

  // Undefined when the project has no network, e.g. after skipping that step.
  const networkName = setup.steps.find((s) => s.key === 'network')?.resourceName;
  // Patch opens in the page, where the person was looking; they can move the
  // conversation to the side dock from there.
  const [inlinePatch, setInlinePatch] = useState<{ prompt: DockPrompt } | null>(null);
  const askPatch = patch.widget
    ? (prompt: string) => {
        trackAction(AnalyticsAction.FirstRunAskPatch);
        setInlinePatch({ prompt: { id: crypto.randomUUID(), text: prompt } });
      }
    : undefined;
  const inline =
    inlinePatch && patch.widget ? (
      <InlinePatch
        widget={patch.widget}
        prompt={inlinePatch.prompt}
        network={setup.hasReadyNetwork ? networkName : undefined}
        onClose={() => setInlinePatch(null)}
        onMoveToDock={(chatId) => {
          setInlinePatch(null);
          patch.openInDock({ chatId });
        }}
      />
    ) : null;

  // The Networks plugin's create dialog, over the page; the Networks page when
  // the plugin isn't installed. Closing it re-reads networks so a new one shows.
  const [networkDialogOpen, setNetworkDialogOpen] = useState(false);
  const createNetwork = () => {
    if (networksPlugin) setNetworkDialogOpen(true);
    else if (networksSlug) navigate(pluginHref(projectId, networksSlug, 'networks'));
  };
  const onNetworkDialogChange = (open: boolean) => {
    setNetworkDialogOpen(open);
    if (!open) void queryClient.invalidateQueries({ queryKey: networkKeys.all });
  };

  // Nothing but (at most) a network exists: the toolbox and Patch stay on
  // offer until something else does, whether or not the network step was
  // skipped. The network hero, when it shows, comes first.
  const showPathChoice = setup.isFresh && !showHero;
  // Health only says something once there is more than a network: an empty
  // project has nothing to report, and a network-only one gets its own line.
  const showHealth = hydrated && !setup.isLoading && hasVisibleResources(setup.steps);

  const { data: networks } = useNetworks(projectId);
  const { data: plugins } = useProjectPlugins(projectId, { enabled: !!projectId });
  const networkCount = networks?.length ?? (setup.hasNetwork ? 1 : 0);
  const networksPlugin = findNetworksPlugin(plugins);
  const networksSlug = networksPlugin?.slug;

  // Which layout fits (network hero, toolbox and Patch, or the resource
  // columns) depends on what the project has, so hold a neutral placeholder
  // until that's known rather than showing one layout and snapping to another.
  const body = loading ? (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading project">
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  ) : showHero && hero ? (
    <div className="flex flex-col gap-4">
      <ProjectHomePluginHero hero={hero} />
      <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
        <Text size="sm" textColor="muted">
          Only need a load balancer for an existing site, or a domain?
        </Text>
        <Button
          type="quaternary"
          theme="borderless"
          size="xs"
          className="text-btn-primary"
          onClick={() => {
            trackAction(AnalyticsAction.SkipNetworkFirstRun);
            setup.skipNetwork();
          }}>
          Skip this step
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-6">
      {/* First, so a conversation stays mounted when the layout below changes. */}
      {inline}
      {showPathChoice ? (
        !inline && (
          <PathChoice
            projectId={projectId}
            networkName={networkName}
            networkReady={setup.hasReadyNetwork}
            network={networks?.find((n) => n.metadata?.name === networkName)}
            networkHref={
              networksSlug && networkName
                ? pluginHref(projectId, networksSlug, `networks/${networkName}`)
                : undefined
            }
            onCreateNetwork={createNetwork}
            onTool={onTool}
            onAskPatch={askPatch}
          />
        )
      ) : (
        <>
          <HomeColumns
            projectId={projectId}
            beforeTraffic={
              !inline &&
              !setup.isLoading && (
                <NextSuggestions
                  projectId={projectId}
                  steps={setup.steps}
                  networkName={networkCount === 1 ? networkName : undefined}
                  networkCount={networkCount}
                  onTool={onTool}
                  onCreateNetwork={createNetwork}
                  onAskPatch={askPatch}
                />
              )
            }
          />
        </>
      )}
    </div>
  );

  return (
    // With Patch in the page the conversation is the focus: the search steps
    // aside and the sections sit closer together.
    <div className={cn('flex flex-col', inline ? 'gap-5' : 'gap-6')}>
      {!inline && <ProjectSearchBar variant="hero" />}
      {showHealth && (
        <div className="flex items-center gap-4">
          <ProjectHealth projectId={projectId} className="min-w-0 flex-1" />
          {networks && (
            <NetworkSummary
              networks={networks}
              networkHref={
                networksSlug
                  ? (name) => pluginHref(projectId, networksSlug, `networks/${name}`)
                  : undefined
              }
              networksHref={
                networksSlug ? pluginHref(projectId, networksSlug, 'networks') : undefined
              }
              onCreateNetwork={createNetwork}
            />
          )}
        </div>
      )}
      {body}
      <HttpProxyFormDialog
        ref={proxyFormRef}
        projectId={projectId}
        onCreated={created.loadBalancerCreated}
      />
      {networksPlugin && (
        <PluginCreateNetworkDialog
          plugin={networksPlugin}
          projectId={projectId}
          open={networkDialogOpen}
          onOpenChange={onNetworkDialogChange}
        />
      )}
      <AddDomainsDialog
        projectId={projectId}
        open={domainOpen}
        onOpenChange={setDomainOpen}
        onSuccess={created.domainCreated}
      />
    </div>
  );
}
