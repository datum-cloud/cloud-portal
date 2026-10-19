import { HomeColumns } from './home-columns';
import { findNetworksPluginSlug } from './home-mode';
import { NextStep } from './next-step';
import { PathChoice, type BuildTool } from './path-choice';
import { ProjectHealth } from './project-health';
import { usePatch } from './use-patch';
import { useProjectSetup } from './use-project-setup';
import { AddDomainsDialog } from '@/features/edge/domain/add';
import {
  HttpProxyFormDialog,
  type HttpProxyFormDialogRef,
} from '@/features/edge/proxy/proxy-form-dialog';
import {
  ProjectHomePluginHero,
  useProjectHomePluginHero,
} from '@/modules/plugins/client/plugin-hero';
import { useProjectPlugins } from '@/modules/plugins/client/use-project-plugins';
import { pluginHref } from '@/modules/project-nav/merge-plugin-nav';
import { AnalyticsAction, useAnalytics } from '@/modules/rybbit';
import { useNetworks } from '@/resources/networks';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Text } from '@datum-cloud/datum-ui/typography';
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
  const { trackAction } = useAnalytics();
  const patch = usePatch();
  const navigate = useNavigate();
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

  const askPatch = patch.canAsk
    ? (prompt: string) => {
        trackAction(AnalyticsAction.FirstRunAskPatch);
        patch.ask(prompt);
      }
    : undefined;

  // Only the network exists: the toolbox and Patch stay on offer until something else does.
  const onlyNetwork =
    setup.hasReadyNetwork && setup.steps.every((s) => s.key === 'network' || s.status === 'todo');
  const showPathChoice = !setup.isLoading && onlyNetwork;
  const networkName =
    setup.steps.find((s) => s.key === 'network')?.resourceName ?? '<your-network>';
  // Health only says something once there is more than a network: an empty
  // project has nothing to report, and a network-only one gets its own line.
  const showHealth =
    !setup.isLoading && setup.steps.some((s) => s.key !== 'network' && s.status !== 'todo');

  const { data: networks } = useNetworks(projectId);
  const { data: plugins } = useProjectPlugins(projectId, { enabled: !!projectId });
  const networksSlug = findNetworksPluginSlug(plugins);

  // Until setup and plugins load, the columns render as they always have (with
  // their own skeletons), so existing projects never wait on the setup reads.
  const body =
    showHero && hero && !heroLoading ? (
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
      <div className="flex flex-col gap-8">
        {showPathChoice ? (
          <PathChoice
            projectId={projectId}
            networkName={networkName}
            network={networks?.find((n) => n.metadata?.name === networkName)}
            networkHref={
              networksSlug
                ? pluginHref(projectId, networksSlug, `networks/${networkName}`)
                : undefined
            }
            onTool={onTool}
            onAskPatch={askPatch}
          />
        ) : (
          <>
            {setup.isFirstRun && setup.currentStep && setup.currentStep !== 'network' && (
              <NextStep
                projectId={projectId}
                steps={setup.steps}
                currentStep={setup.currentStep}
                onAskPatch={askPatch}
              />
            )}
            <HomeColumns projectId={projectId} />
          </>
        )}
      </div>
    );

  return (
    <div className="flex flex-col gap-8">
      {showHealth && <ProjectHealth projectId={projectId} />}
      {body}
      <HttpProxyFormDialog ref={proxyFormRef} projectId={projectId} />
      <AddDomainsDialog
        projectId={projectId}
        open={domainOpen}
        onOpenChange={setDomainOpen}
        onSuccess={(domain) =>
          navigate(
            getPathWithParams(paths.project.detail.domains.detail.overview, {
              projectId,
              domainId: domain.name,
            })
          )
        }
      />
    </div>
  );
}
